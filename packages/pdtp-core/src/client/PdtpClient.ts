import { bitmapToPngBlob, createPngWithAlpha } from "../helpers/imageUtils";
import type {
	FontMetadata,
	ImageMetadata,
	PageMetadata,
	PdtpChunkPayload,
	PdtpRequestOptions,
	TextMetadata,
} from "../types";

export type OnPdtpDataCallback = (chunk: PdtpChunkPayload) => void;

export class PdtpClient {
	private file: string;
	private headers?: HeadersInit;
	private abortController?: AbortController;
	private buffer: Uint8Array = new Uint8Array();
	private reader: ReadableStreamDefaultReader<
		Uint8Array<ArrayBufferLike>
	> | null = null;

	constructor(options: PdtpRequestOptions) {
		this.file = options.file;
		this.abortController = options.abortController;

		if (options.headers) {
			// 例: PDTP: "start=1;end=10;base=1;"
			const pdtpValue = Object.entries(options.headers)
				.map(([k, v]) => `${k}=${v}`)
				.join(";");

			this.headers = {
				...(this.headers || {}),
				PDTP: `${pdtpValue};`, // ";" で終端
			};
		}
	}

	/**
	 * サーバーからのchunkedレスポンスを読み取り、コールバックに通知する
	 */
	public async fetchChunkedData(onData: OnPdtpDataCallback) {
		// fetch開始
		const response = await fetch(this.file, {
			signal: this.abortController?.signal,
			headers: this.headers,
		});
		const reader = response.body?.getReader();

		if (!reader) {
			throw new Error("Failed to get reader from response body.");
		}
		this.reader = reader;

		// 受信バッファ

		while (true) {
			// ストリームからデータ読み取り
			const { done, value } = await reader.read();
			if (done) break; // 読み取り終了
			if (!value) continue; // null/undefinedの場合スキップ

			// バッファにデータを追加
			this.buffer = new Uint8Array([...this.buffer, ...value]);

			// バッファからメッセージを解析
			while (this.buffer.length >= 5) {
				// 先頭5バイト: [ messageType (1byte), messageLength (4byte, BigEndian) ]
				const messageType = this.buffer[0];
				const messageLength = new DataView(this.buffer.buffer).getUint32(
					1,
					false,
				); // BigEndian

				// メタデータ(または先頭チャンク)がまだ全て揃っていない場合は読み取りを待つ
				if (this.buffer.length < 5 + messageLength) break;

				// メタデータ(＝JSON文字列)部分を切り出す
				const messageData = this.buffer.slice(5, 5 + messageLength);
				// バッファを前進
				this.buffer = this.buffer.slice(5 + messageLength);

				if (messageType === 0x00) {
					try {
						// pageデータ
						const json = this.convertPageData(messageData);
						onData({ type: "page", data: json });
					} catch (e) {
						console.error("Failed to parse page data:", e);
					}
				} else if (messageType === 0x01) {
					try {
						// textデータ
						const json = this.convertTextData(messageData);

						onData({ type: "text", data: json });
					} catch (e) {
						console.error("Failed to parse text data:", e);
					}
				} else if (messageType === 0x02) {
					try {
						// imageデータ
						const { json, blob } = await this.convertImageData(messageData);
						onData({ type: "image", data: json, blob });
					} catch (e) {
						console.error("Failed to parse image data:", e);
					}
				} else if (messageType === 0x03) {
					try {
						// fontデータ
						const { json, blob } = await this.convertFontData(messageData);
						onData({ type: "font", data: json, blob });
					} catch (e) {
						console.error("Failed to parse font data:", e);
					}
				} else if (messageType === 0x04) {
					try {
						// pathデータ
						const json = this.convertPathData(messageData);
						onData({ type: "path", data: json });
					} catch (e) {
						console.error("Failed to parse path data:", e);
					}
				} else {
					console.error("Unknown message type:", messageType);
				}
			}
		}
	}
	private convertPageData(messageData: Uint8Array): PageMetadata {
		const decoder = new TextDecoder("utf-8");
		const text = decoder.decode(messageData, { stream: true });
		const json = JSON.parse(text);
		return json as PageMetadata;
	}

	private convertTextData(messageData: Uint8Array): TextMetadata {
		const decoder = new TextDecoder("utf-8");
		const text = decoder.decode(messageData, { stream: true });
		const json = JSON.parse(text);
		return json as TextMetadata;
	}

	private async convertImageData(
		messageData: Uint8Array,
	): Promise<{ json: ImageMetadata; blob: Blob }> {
		// メタデータ(JSON)を取得
		const decoder = new TextDecoder("utf-8");
		const text = decoder.decode(messageData, { stream: true });
		const json = JSON.parse(text) as ImageMetadata;

		// 画像本体のバイト数を取得
		const imageLength = json.length;

		// 画像バイナリが揃うまで読み込む
		await this.waitForBuffer(imageLength);
		// 画像バイトを切り出して Blob化
		const imageData = this.extractBuffer(imageLength);
		if (json.ext === "jpg") {
			const image = new Blob([imageData], { type: "image/jpeg" });

			// マスクがあるかどうか
			if (json.maskLength === 0) {
				// マスクなしならそのまま通知
				return { json, blob: image };
			}

			// マスクあり => マスクぶんが揃うまで読み込む
			await this.waitForBuffer(json.maskLength);
			const maskData = await this.decompressWithDeflate(
				this.extractBuffer(json.maskLength),
			);

			// createPngWithAlpha で合成
			const maskImage = await createPngWithAlpha(image, maskData);
			return { json, blob: maskImage };
		}
		const decompressedImage = await this.decompressWithDeflate(imageData);
		const maskLength = json.maskLength;
		// マスクあり => マスクぶんが揃うまで読み込む
		await this.waitForBuffer(maskLength);
		const maskraw = this.extractBuffer(maskLength);
		const maskData = await this.decompressWithDeflate(maskraw);
		const alphaApplyImage = [];
		if (maskData.length > 0) {
			for (let i = 0; i < decompressedImage.length / 3; i++) {
				alphaApplyImage.push(decompressedImage[i * 3 + 0]);
				alphaApplyImage.push(decompressedImage[i * 3 + 1]);
				alphaApplyImage.push(decompressedImage[i * 3 + 2]);
				alphaApplyImage.push(maskData[i]);
			}
		} else {
			for (let i = 0; i < decompressedImage.length / 3; i++) {
				alphaApplyImage.push(decompressedImage[i * 3 + 0]);
				alphaApplyImage.push(decompressedImage[i * 3 + 1]);
				alphaApplyImage.push(decompressedImage[i * 3 + 2]);
				alphaApplyImage.push(255);
			}
		}
		const image = await bitmapToPngBlob(
			json.width,
			json.height,
			new Uint8Array(alphaApplyImage),
		);
		return { json, blob: image };
	}

	private async convertFontData(messageData: Uint8Array): Promise<{
		json: FontMetadata;
		blob: Blob;
	}> {
		const decoder = new TextDecoder("utf-8");
		const text = decoder.decode(messageData, { stream: true });
		const json = JSON.parse(text) as FontMetadata;

		// フォントバイナリの長さ
		const fontLength = json.length;

		// bufferが足りなければ追加read
		await this.waitForBuffer(fontLength);
		const fontData = this.extractBuffer(fontLength);

		const font = new Blob([fontData], {
			type: "font/ttf",
		});
		return { json, blob: font };
	}

	private convertPathData(messageData: Uint8Array) {
		const decoder = new TextDecoder("utf-8");
		const text = decoder.decode(messageData, { stream: true });
		const json = JSON.parse(text);
		return json;
	}

	private extractBuffer(length: number): Uint8Array {
		const buf = this.buffer.slice(0, length);
		this.buffer = this.buffer.slice(length);
		return buf;
	}
	private async waitForBuffer(length: number): Promise<void> {
		if (this.buffer.length >= length) return;
		if (!this.reader) throw new Error("Reader is not initialized");
		let newBuffer = this.buffer;
		while (newBuffer.length < length) {
			const { done, value } = await this.reader.read();
			if (done) break;

			const merged = new Uint8Array(newBuffer.length + value.length);
			merged.set(newBuffer, 0);
			merged.set(value, newBuffer.length);
			newBuffer = merged;
		}

		this.buffer = newBuffer;
	}

	private async decompressWithDeflate(data: Uint8Array): Promise<Uint8Array> {
		const ds = new DecompressionStream("deflate");
		const stream = new ReadableStream({
			start(controller) {
				controller.enqueue(data);
				controller.close();
			},
		}).pipeThrough(ds);
		let decompressed = new ArrayBuffer();
		// FIXME: エラーが発生するが解凍は成功している
		try {
			decompressed = await new Response(stream).arrayBuffer();
		} catch (e) {
			console.log("decompress error but this error is not problem", e);
		}
		return new Uint8Array(decompressed);
	}
}

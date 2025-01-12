import { createPngWithAlpha } from "../helpers/imageUtils";
import type {
	FontMetadata,
	ImageMetadata,
	PdtpChunkPayload,
	PdtpRequestOptions,
} from "../types";

export type OnPdtpDataCallback = (chunk: PdtpChunkPayload) => void;

export class PdtpClient {
	private file: string;
	private headers?: HeadersInit;
	private abortController?: AbortController;

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
		});
		const reader = response.body?.getReader();

		if (!reader) {
			throw new Error("Failed to get reader from response body.");
		}

		// 受信バッファ
		let buffer = new Uint8Array();

		while (true) {
			// ストリームからデータ読み取り
			const { done, value } = await reader.read();
			if (done) break; // 読み取り終了
			if (!value) continue; // null/undefinedの場合スキップ

			// バッファにデータを追加
			buffer = new Uint8Array([...buffer, ...value]);

			// バッファからメッセージを解析
			while (buffer.length >= 5) {
				// 先頭5バイト: [ messageType (1byte), messageLength (4byte, BigEndian) ]
				const messageType = buffer[0];
				const messageLength = new DataView(buffer.buffer).getUint32(1, false); // BigEndian

				// メタデータ(または先頭チャンク)がまだ全て揃っていない場合は読み取りを待つ
				if (buffer.length < 5 + messageLength) break;

				// メタデータ(＝JSON文字列)部分を切り出す
				const messageData = buffer.slice(5, 5 + messageLength);
				// バッファを前進
				buffer = buffer.slice(5 + messageLength);

				// FIXME: ここで各メッセージタイプに応じて処理を分岐
				try {
					if (messageType === 0x00) {
						// pageデータ
						const decoder = new TextDecoder("utf-8");
						const text = decoder.decode(messageData, { stream: true });
						const json = JSON.parse(text);
						onData({ type: "page", data: json });
					} else if (messageType === 0x01) {
						// textデータ
						const decoder = new TextDecoder("utf-8");
						const text = decoder.decode(messageData, { stream: true });
						const json = JSON.parse(text);
						onData({ type: "text", data: json });
					} else if (messageType === 0x02) {
						// imageデータ

						// メタデータ(JSON)を取得
						const decoder = new TextDecoder("utf-8");
						const text = decoder.decode(messageData, { stream: true });
						const json = JSON.parse(text) as ImageMetadata;

						// 画像本体のバイト数を取得
						const imageLength = json.length;

						// 画像バイナリが揃うまで読み込む
						while (buffer.length < imageLength) {
							const { done, value } = await reader.read();
							if (done) break;
							buffer = new Uint8Array([...buffer, ...value]);
						}
						// 画像バイトを切り出して Blob化
						const imageData = buffer.slice(0, imageLength);
						buffer = buffer.slice(imageLength);
						const image = new Blob([imageData], { type: "image/jpeg" });

						// マスクがあるかどうか
						if (json.maskLength === 0) {
							// マスクなしならそのまま通知
							onData({ type: "image", data: json, blob: image });
							continue;
						}

						// マスクあり => マスクぶんが揃うまで読み込む
						while (buffer.length < json.maskLength) {
							const { done, value } = await reader.read();
							if (done) break;
							buffer = new Uint8Array([...buffer, ...value]);
						}
						const maskData = buffer.slice(0, json.maskLength);
						buffer = buffer.slice(json.maskLength);

						// createPngWithAlpha で合成
						const maskImage = await createPngWithAlpha(image, maskData);
						onData({ type: "image", data: json, blob: maskImage });
					} else if (messageType === 0x03) {
						// fontデータ
						const decoder = new TextDecoder("utf-8");
						const text = decoder.decode(messageData, { stream: true });
						const json = JSON.parse(text) as FontMetadata;

						// フォントバイナリの長さ
						const fontLength = json.length;

						// bufferが足りなければ追加read
						while (buffer.length < fontLength) {
							const { done, value } = await reader.read();
							if (done) break;
							buffer = new Uint8Array([...buffer, ...value]);
						}
						const fontData = buffer.slice(0, fontLength);
						buffer = buffer.slice(fontLength);

						const font = new Blob([fontData], {
							type: "font/ttf",
						});
						onData({ type: "font", data: json, blob: font });
					} else {
						console.error("Unknown message type:", messageType);
					}
				} catch (e) {
					console.error("Failed to parse JSON:", e);
				}
			}
		}
	}
}

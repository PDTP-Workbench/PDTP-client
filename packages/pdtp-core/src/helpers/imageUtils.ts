// packages/core/src/helpers/imageUtils.ts

/**
 * JPEG の Blob とアルファ用バイト配列を合成して透過PNGを生成する
 */
export async function createPngWithAlpha(
	jpegBlob: Blob,
	alphaBytes: Uint8Array,
): Promise<Blob> {
	return new Promise<Blob>((resolve, reject) => {
		const img = new Image();
		const url = URL.createObjectURL(jpegBlob);

		img.onload = () => {
			URL.revokeObjectURL(url);
			try {
				const canvas = document.createElement("canvas");
				canvas.width = img.width;
				canvas.height = img.height;

				const ctx = canvas.getContext("2d");
				if (!ctx) {
					throw new Error("2Dコンテキストの取得に失敗しました");
				}
				ctx.drawImage(img, 0, 0);

				// 画像データを取得 (RGBA)
				const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
				const data = imageData.data;

				if (alphaBytes.length !== data.length / 4) {
					throw new Error(
						`アルファ値配列(${alphaBytes.length})が画像ピクセル数(${
							data.length / 4
						})と一致しません`,
					);
				}

				// アルファ値を適用
				for (let i = 0; i < alphaBytes.length; i++) {
					data[i * 4 + 3] = alphaBytes[i];
				}

				ctx.putImageData(imageData, 0, 0);

				canvas.toBlob((blob) => {
					if (blob) resolve(blob);
					else reject("PNGのBlobへの変換に失敗しました");
				}, "image/png");
			} catch (error) {
				reject(error);
			}
		};

		img.onerror = (e) => {
			URL.revokeObjectURL(url);
			reject(e);
		};
		img.src = url;
	});
}

export const bitmapToPngBlob = (
	width: number,
	height: number,
	pixelData: Uint8Array,
): Promise<Blob> => {
	return new Promise((resolve, reject) => {
		let uint8Data: Uint8Array;
		if (pixelData instanceof ArrayBuffer) {
			uint8Data = new Uint8Array(pixelData);
		} else if (pixelData instanceof Uint8Array) {
			uint8Data = pixelData;
		} else {
			reject(
				new Error(
					"pixelData は Uint8Array または ArrayBuffer でなければなりません。",
				),
			);
			return;
		}

		// Uint8ClampedArray に変換
		const clampedData = new Uint8ClampedArray(
			uint8Data.buffer,
			uint8Data.byteOffset,
			uint8Data.byteLength,
		);

		// Canvas要素を作成
		const canvas: HTMLCanvasElement = document.createElement("canvas");
		canvas.width = width;
		canvas.height = height;

		// 2Dコンテキストを取得
		const ctx = canvas.getContext("2d");
		if (!ctx) {
			reject(new Error("2Dコンテキストの取得に失敗しました。"));
			return;
		}

		// ImageDataオブジェクトを作成
		const imageData = new ImageData(clampedData, width, height);

		// Canvasにピクセルデータを描画
		ctx.putImageData(imageData, 0, 0);

		// PNG形式のBlobを生成
		canvas.toBlob((blob) => {
			if (blob) {
				resolve(blob);
			} else {
				reject(new Error("Blobの生成に失敗しました。"));
			}
		}, "image/png");
	});
};

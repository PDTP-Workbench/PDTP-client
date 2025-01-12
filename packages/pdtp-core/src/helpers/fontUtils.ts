// packages/core/src/helpers/fontUtils.ts

/**
 * Blob化したフォントを FontFace として読み込み、document へ登録する
 *
 * @param fontBlob Blob (フォントデータ)
 * @param fontFamily string (利用時に指定するフォント名)
 */
export async function loadFont(fontBlob: Blob, fontFamily: string) {
	const fontFace = new FontFace(fontFamily, URL.createObjectURL(fontBlob));
	// フォントを読み込む
	await fontFace.load();
	document.fonts.add(fontFace);
}

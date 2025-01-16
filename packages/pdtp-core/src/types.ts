// packages/core/src/types.ts
export enum PdtpDataType {
	PAGE = 0x00,
	TEXT = 0x01,
	IMAGE = 0x02,
	FONT = 0x03,
	PATH = 0x04,
	ERROR = 0xff,
}

export interface PageMetadata {
	width: number; // px単位
	height: number; // px単位
	page: number; // ページ番号
}

export interface TextMetadata {
	text: string; // テキスト文字列(UTF-8)
	x: number; // px単位
	y: number; // px単位
	z: number; // z-index
	fontSize: number; // px単位
	font: string; // フォントID
	page: number; // ページ番号
}

export interface ImageMetadata {
	x: number; // px単位
	y: number; // px単位
	z: number; // z-index
	width: number; // px単位
	height: number; // px単位
	dw: number; // px単位
	dh: number; // px単位
	length: number; // 画像本体データのバイト数
	maskLength: number; // 透過マスク画像データのバイト数
	page: number; // ページ番号
	ext: string; // 画像の拡張子
	clipPath: string; // クリッピングパス
}

export interface FontMetadata {
	fontId: number; // フォントのid (あるいは文字列でも可)
	length: number; // フォントデータのバイト数
}

export interface PathMetadata {
	x: number;
	y: number;
	z: number;
	width: number;
	height: number;
	path: string;
	fillColor: string;
	strokeColor: string;
	page: number;
}

export type PdtpChunkPayload =
	| {
			type: "page";
			data: PageMetadata;
	  }
	| {
			type: "text";
			data: TextMetadata;
	  }
	| {
			type: "image";
			data: ImageMetadata;
			blob: Blob; // 画像(アルファ適用済み or 非適用)のBlob
	  }
	| {
			type: "font";
			data: FontMetadata;
			blob: Blob; // フォントのBlob
	  }
	| {
			type: "path";
			data: PathMetadata;
	  };

// -------------------------------------------
// PDTP用のクライアントリクエスト時に設定するオプション類

/**
 * PDTP で送信する「base」「start」「end」などのヘッダー設定値
 * 例: PDTP: "start=1;end=10;base=1;"
 */
export interface PdtpRequestHeaders {
	base?: number;
	start?: number;
	end?: number;
}

/**
 * fetchするときに使うオプション
 *  - file: リクエストを送る path (URL)
 *  - headers: PDTP特有のヘッダー設定
 *  など追加パラメータは必要に応じて増やせる
 */
export interface PdtpRequestOptions {
	file: string; // e.g. "http://localhost:8080/pdf-protocol?file=example.pdf"
	headers?: PdtpRequestHeaders; // PDTPヘッダー
	abortController?: AbortController; // fetch中断用
}

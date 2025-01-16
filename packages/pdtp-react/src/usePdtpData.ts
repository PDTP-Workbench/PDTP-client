// packages/react/src/usePdtpData.ts
import {
	type ImageMetadata,
	type PathMetadata,
	type PdtpChunkPayload,
	PdtpClient,
	type TextMetadata,
} from "@pdtp/core";
import { useEffect, useMemo, useState } from "react";

type PageData = {
	page: number;
	width: number;
	height: number;
	texts: Array<TextMetadata>;
	images: Array<{ meta: ImageMetadata; url: string }>;
	paths: Array<PathMetadata>;
};

interface UsePdtpDataProps {
	file: string;
	base?: number;
	start?: number;
	end?: number;
}

/**
 * chunkedデータを取得し、ページごとにまとめた状態を返す
 */
export function usePdtpData(props: UsePdtpDataProps) {
	const [pages, setPages] = useState<Record<number, PageData>>({});

	// PdtpClient 生成
	const client = useMemo(() => {
		return new PdtpClient({
			file: props.file,
			headers: {
				base: props.base,
				start: props.start,
				end: props.end,
			},
		});
	}, [props.file, props.base, props.start, props.end]);

	useEffect(() => {
		let mounted = true;
		const fetchData = async () => {
			await client.fetchChunkedData((chunk) => {
				if (!mounted) return;
				handlePdtpData(chunk);
			});
		};

		fetchData().catch(console.error);

		return () => {
			mounted = false;
		};
	}, [client]);

	const handlePdtpData = (chunk: PdtpChunkPayload) => {
		switch (chunk.type) {
			case "page": {
				const meta = chunk.data;
				setPages((prev) => ({
					...prev,
					[meta.page]: {
						page: meta.page,
						width: meta.width,
						height: meta.height,
						texts: [],
						images: [],
						paths: [],
					},
				}));
				return;
			}
			case "text": {
				const meta = chunk.data;
				setPages((prev) => {
					const existing = prev[meta.page] ?? {
						page: meta.page,
						width: 0,
						height: 0,
						texts: [],
						images: [],
					};
					return {
						...prev,
						[meta.page]: {
							...existing,
							texts: [...existing.texts, meta],
						},
					};
				});
				return;
			}
			case "image": {
				const meta = chunk.data;
				// Blob -> ObjectURL
				const imageUrl = URL.createObjectURL(chunk.blob);
				setPages((prev) => {
					const existing = prev[meta.page] ?? {
						page: meta.page,
						width: 0,
						height: 0,
						texts: [],
						images: [],
					};
					return {
						...prev,
						[meta.page]: {
							...existing,
							images: [...existing.images, { meta, url: imageUrl }],
						},
					};
				});
				return;
			}
			case "font": {
				// フォントは document.fonts.add(...) などでグローバルに読み込む
				// すでに PdtpClient 内 or useEffect などで loadFont() を行っても良い
				// chunk.data.fontId で identify, chunk.blob がフォントデータ
				// ただしフォント名指定がある場合はそこに合わせる
				// 必要があれば setState で管理する
				return;
			}
			case "path": {
				const meta = chunk.data;
				setPages((prev) => {
					const existing = prev[meta.page] ?? {
						page: meta.page,
						width: 0,
						height: 0,
						texts: [],
						images: [],
						paths: [],
					};
					return {
						...prev,
						[meta.page]: {
							...existing,
							paths: [...existing.paths, meta],
						},
					};
				});
				break;
			}
			default:
				return;
		}
	};

	return pages;
}

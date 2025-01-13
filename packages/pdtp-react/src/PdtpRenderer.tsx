import type { FC } from "react";
import { usePdtpData } from "./usePdtpData";

interface PdtpRendererProps {
	file: string;
	base?: number;
	start?: number;
	end?: number;
}

/**
 * PDTP Protocol で取得したデータを簡易的に描画するRenderer例
 */
export const PdtpRenderer: FC<PdtpRendererProps> = ({
	file,
	base,
	start,
	end,
}) => {
	const pages = usePdtpData({ file, base, start, end });

	return (
		<div style={{ display: "flex", gap: "12px", flexDirection: "row" }}>
			<div style={{ display: "flex", gap: "12px", flexDirection: "column" }}>
				{Object.values(pages).map((pageData) => {
					return (
						<div
							key={pageData.page}
							style={{
								position: "relative",
								width: `${pageData.width}px`,
								height: `${pageData.height}px`,
								backgroundColor: "white",
							}}
						>
							<p
								style={{
									zIndex: 1000,
									position: "absolute",
									left: "0",
									top: "0",
									color: "black",
									fontSize: "16px",
								}}
							>
								Page:{pageData.page}
							</p>

							{pageData.texts.map((t) => (
								<div
									key={t.font}
									style={{
										zIndex: t.z,
										position: "absolute",
										left: `${t.x}px`,
										top: `${pageData.height - t.y}px`,
										color: "black",
										fontSize: `${t.fontSize}px`,
										translate: "0 -75%",
										fontFamily: t.font,
									}}
								>
									{t.text}
								</div>
							))}

							{pageData.images.map((img) => (
								<img
									key={img.url}
									src={img.url}
									alt="pdtp-image"
									style={{
										position: "absolute",
										zIndex: img.meta.z,
										left: `${img.meta.x}px`,
										top: `${pageData.height - img.meta.y}px`,
										width: `${img.meta.dw}px`,
										height: `${img.meta.dh}px`,
										translate: "0 -100%",
									}}
								/>
							))}
						</div>
					);
				})}
			</div>
		</div>
	);
};

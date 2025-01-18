import type { FC } from "react";
import { usePdtpData } from "./usePdtpData";

/**
 * PDTP Protocol で取得したデータを簡易的に描画するRenderer例
 */
export const PdtpRenderer: FC = () => {
	const pages = usePdtpData();

	return (
		<div style={{ display: "flex", gap: "12px", flexDirection: "row" }}>
			<div style={{ display: "flex", flexDirection: "column" }}>
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
							{pageData.texts.map((t) => (
								<div
									key={t.font}
									style={{
										zIndex: t.z,
										position: "absolute",
										left: `${t.x}px`,
										top: `${pageData.height - t.y}px`,
										color: t.color,
										fontSize: `${t.fontSize}px`,
										translate: "0 -75%",
										fontFamily: t.font,
									}}
								>
									{t.text}
								</div>
							))}

							{pageData.images.map((img) => {
								if (img.meta.clipPath === "") {
									return (
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
									);
								}
								return (
									// biome-ignore lint/a11y/noSvgWithoutTitle: 意味のあるsvgではないため
									<svg
										key={img.url}
										style={{
											position: "absolute",
											zIndex: img.meta.z,
										}}
										width={pageData.width}
										height={pageData.height}
									>
										<clipPath id={img.url}>
											<path d={img.meta.clipPath} />
										</clipPath>
										<image
											x={img.meta.x}
											y={pageData.height - img.meta.y - img.meta.dh}
											width={img.meta.dw}
											height={img.meta.dh}
											href={img.url}
											clipPath={`url(#${img.url})`}
										/>
									</svg>
								);
							})}
							{pageData.paths.map((path) => (
								// biome-ignore lint/a11y/noSvgWithoutTitle: 意味のあるsvgではないため
								<svg
									key={path.path}
									style={{
										position: "absolute",
										zIndex: path.z,
									}}
									fill={path.fillColor}
									width={pageData.width}
									height={pageData.height}
								>
									<path
										d={path.path}
										fill={path.fillColor}
										stroke={path.strokeColor}
									/>
								</svg>
							))}
						</div>
					);
				})}
			</div>
		</div>
	);
};

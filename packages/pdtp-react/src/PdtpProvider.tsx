import type { PdtpRequestOptions } from "@pdtp/core";
import type React from "react";
import { createContext, useContext, useMemo } from "react";

interface PdtpContextProps {
	requestOptions: PdtpRequestOptions;
}

const PdtpContext = createContext<PdtpContextProps | null>(null);

export const PdtpProvider: React.FC<{
	options: PdtpRequestOptions;
	children: React.ReactNode;
}> = ({ options, children }) => {
	const value = useMemo(() => ({ requestOptions: options }), [options]);
	return <PdtpContext.Provider value={value}>{children}</PdtpContext.Provider>;
};

export function usePdtpContext() {
	const ctx = useContext(PdtpContext);
	if (!ctx) {
		throw new Error("usePdtpContext must be used within a PdtpProvider.");
	}
	return ctx;
}

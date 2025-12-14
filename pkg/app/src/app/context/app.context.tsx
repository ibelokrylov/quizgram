import { createContext } from "react";

export const AppContext = createContext<AppContext>({
	loading: true,
	setLoading: () => {},
	headerContent: null,
	setHeaderContent: () => {},
});

export type AppContext = {
	loading: boolean;
	setLoading: (v: boolean) => void;
	headerContent: React.ReactNode;
	setHeaderContent: (content: React.ReactNode) => void;
};

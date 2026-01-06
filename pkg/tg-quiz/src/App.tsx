import "@telegram-apps/telegram-ui/dist/styles.css";

import { AppRoot } from "@telegram-apps/telegram-ui";
import { AppContextProvider } from "./App.context.provider";
import { Content } from "./Content";

function App() {
  return (
    <AppContextProvider>
      <AppRoot className="app" platform={"ios"} appearance="light">
        <Content />
      </AppRoot>
    </AppContextProvider>
  );
}

export default App;

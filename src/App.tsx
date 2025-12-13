import "./App.css";
import { SceneProvider } from "./context/sceneContext";
import HomePage from "./page/homepage";

function App() {
  return (
    <SceneProvider>
      <HomePage />
    </SceneProvider>
  );
}

export default App;

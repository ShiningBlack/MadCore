import { AssetsDashboard } from "./components/AssetsDashboard";
import { LoginScreen } from "./components/LoginScreen";
import { useUserStore } from "./store/useUserStore";
import "./App.css";

function App() {
  const isAuthenticated = useUserStore(state => state.isAuthenticated);

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return <AssetsDashboard />;
}

export default App;

import { useEffect } from "react";
import { useDispatch } from "react-redux";
import AppRoutes from "./routes/AppRoutes.jsx";
import { fetchCurrentUser } from "./store/slices/authSlice.js";
import { SocketProvider } from "./context/SocketContext.jsx";

function App() {
  const dispatch = useDispatch();

  useEffect(() => {
    // Check if user has an existing HTTP-only cookie session
    dispatch(fetchCurrentUser());
  }, [dispatch]);

  return (
    <SocketProvider>
      <AppRoutes />
    </SocketProvider>
  );
}

export default App;
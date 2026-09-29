import { useEffect } from "react";
import { useDispatch } from "react-redux";
import AppRoutes from "./routes/AppRoutes.jsx";
import { fetchCurrentUser } from "./store/slices/authSlice.js";

function App() {
  const dispatch = useDispatch();

  useEffect(() => {
    // Check if user has an existing HTTP-only cookie session
    dispatch(fetchCurrentUser());
  }, [dispatch]);

  return <AppRoutes />;
}

export default App;
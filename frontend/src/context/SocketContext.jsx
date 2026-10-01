import { createContext, useContext, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { connectSocket, disconnectSocket, getSocket } from "../utils/socket.js";

const SocketContext = createContext(null);

/**
 * Provides Socket.IO connection to the component tree.
 * Automatically connects when user is authenticated and disconnects on logout.
 */
export function SocketProvider({ children }) {
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const socketRef = useRef(null);

  useEffect(() => {
    if (isAuthenticated && user?._id) {
      socketRef.current = connectSocket(user._id);
    } else {
      disconnectSocket();
      socketRef.current = null;
    }

    return () => {
      // Cleanup on unmount (but don't disconnect on re-renders)
    };
  }, [isAuthenticated, user?._id]);

  return (
    <SocketContext.Provider value={getSocket}>
      {children}
    </SocketContext.Provider>
  );
}

/**
 * Hook to access the Socket.IO instance.
 * Returns a getter function — call it to get the current socket.
 *
 * Usage:
 *   const getSocket = useSocket();
 *   const socket = getSocket();
 *   if (socket) socket.on("event", handler);
 */
export function useSocket() {
  return useContext(SocketContext);
}

import ApiError from "../utils/ApiError.js";



const authorizeRole = (...allowedRoles) => {
  return (req, res, next) => {
  

    if (!req.user) {
      return next(
        new ApiError(
          401,
          "Authentication required"
        )
      );
    }

 

    if (!allowedRoles.length) {
      return next(
        new ApiError(
          500,
          "No roles configured for this route"
        )
      );
    }

 

    const userRole = req.user.role;



    if (!allowedRoles.includes(userRole)) {
      return next(
        new ApiError(
          403,
          "You do not have permission to access this resource"
        )
      );
    }

 
    

    next();
  };
};


export {
  authorizeRole,
};
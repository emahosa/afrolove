import { Outlet } from "react-router-dom";
import { Link } from "react-router-dom";

const AuthLayout = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
      <div className="absolute top-6 left-6">
        <Link to="/" className="text-2xl font-bold text-gray-900">
          Reve Image
        </Link>
      </div>
      <div className="w-full max-w-md">
        <Outlet />
      </div>
    </div>
  );
};

export default AuthLayout;

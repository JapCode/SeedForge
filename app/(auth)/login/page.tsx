import { redirect } from "next/navigation";
import { getSessionUserId } from "@/infrastructure/auth/getSessionUserId";
import { LoginForm } from "./_components/LoginForm";

const LoginPage = async () => {
  const userId = await getSessionUserId();
  if (userId) {
    redirect("/dashboard");
  }

  return <LoginForm />;
};

export default LoginPage;

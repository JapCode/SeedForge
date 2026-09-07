import { redirect } from "next/navigation";
import { getSessionUserId } from "@/infrastructure/auth/getSessionUserId";
import { RegisterForm } from "./_components/RegisterForm";

const RegisterPage = async () => {
  const userId = await getSessionUserId();
  if (userId) {
    redirect("/dashboard");
  }

  return <RegisterForm />;
};

export default RegisterPage;

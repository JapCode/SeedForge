import { Column } from "@once-ui-system/core";
import { redirect } from "next/navigation";
import { getSessionUserId } from "@/infrastructure/auth/getSessionUserId";
import { RegisterForm } from "./_components/RegisterForm";

const RegisterPage = async () => {
  const userId = await getSessionUserId();
  if (userId) {
    redirect("/");
  }

  return (
    <Column fillWidth horizontal="center" paddingY="80">
      <RegisterForm />
    </Column>
  );
};

export default RegisterPage;

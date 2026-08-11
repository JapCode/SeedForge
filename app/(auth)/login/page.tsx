import { Column } from "@once-ui-system/core";
import { redirect } from "next/navigation";
import { getSessionUserId } from "@/infrastructure/auth/getSessionUserId";
import { LoginForm } from "./_components/LoginForm";

const LoginPage = async () => {
  const userId = await getSessionUserId();
  if (userId) {
    redirect("/");
  }

  return (
    <Column fillWidth horizontal="center" paddingY="80">
      <LoginForm />
    </Column>
  );
};

export default LoginPage;

import { redirect } from "next/navigation";
import { Column } from "@once-ui-system/core";
import { getSessionUserId } from "@/infrastructure/auth/getSessionUserId";

const AppLayout = async ({ children }: { children: React.ReactNode }) => {
  const userId = await getSessionUserId();

  if (!userId) {
    redirect("/login");
  }

  return (
    <Column fillWidth horizontal="center">
      {children}
    </Column>
  );
};

export default AppLayout;

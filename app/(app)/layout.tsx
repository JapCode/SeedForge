import { redirect } from "next/navigation";
import { Column } from "@once-ui-system/core";
import { getSessionUserId } from "@/infrastructure/auth/getSessionUserId";

/**
 * Layout for the authenticated app area. Guards every route in the (app)
 * group (dashboard, crear, torneo/...) — pages under it can safely assume
 * getSessionUserId() returns a user. The public /share route lives outside
 * this group on purpose.
 */
const AppLayout = async ({ children }: { children: React.ReactNode }) => {
  const userId = await getSessionUserId();

  if (!userId) {
    redirect("/login");
  }

  return (
    <Column fillWidth paddingX="16">
      <Column fillWidth horizontal="center">
        {children}
      </Column>
    </Column>
  );
};

export default AppLayout;

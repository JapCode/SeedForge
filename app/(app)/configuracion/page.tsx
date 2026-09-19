import { Column, Heading, Text } from "@once-ui-system/core";
import { getSessionUserId } from "@/infrastructure/auth/getSessionUserId";
import { auth } from "@/infrastructure/auth/auth";
import { headers } from "next/headers";
import { ProfileForm } from "./_components/ProfileForm";
import { PasswordForm } from "./_components/PasswordForm";
import { EmailForm } from "./_components/EmailForm";
import { LinkedAccountsForm } from "./_components/LinkedAccountsForm";

const ConfiguracionPage = async () => {
  const userId = await getSessionUserId();
  const session = await auth.api.getSession({ headers: await headers() });

  const user = session?.user;
  const googleEnabled = !!(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
  );

  return (
    <Column fillWidth maxWidth={48} horizontal="center" paddingY="32" gap="32">
      <Column gap="8">
        <Heading as="h1" variant="heading-strong-l">
          Configuración
        </Heading>
        <Text onBackground="neutral-weak">
          Gestioná tu perfil, email y contraseña.
        </Text>
      </Column>

      <Column gap="24" maxWidth={48}>
        <ProfileForm
          userId={userId!}
          name={user?.name ?? ""}
          email={user?.email ?? ""}
        />

        <EmailForm currentEmail={user?.email ?? ""} />

        <PasswordForm />

        {googleEnabled && <LinkedAccountsForm />}
      </Column>
    </Column>
  );
};

export default ConfiguracionPage;

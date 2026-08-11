import { Column } from "@once-ui-system/core";
import { CreateTournamentForm } from "./CreateTournamentForm";

const CreateTournamentPage = () => {
  return (
    <Column fillWidth horizontal="center" paddingY="80">
      <CreateTournamentForm />
    </Column>
  );
};

export default CreateTournamentPage;

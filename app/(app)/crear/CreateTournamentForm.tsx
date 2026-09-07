"use client";

import { useActionState, useRef, useState } from "react";
import {
  Column,
  Row,
  Heading,
  Text,
  Input,
  Button,
  Switch,
  SegmentedControl,
  Accordion,
  InteractiveDetails,
  Table,
  Icon,
} from "@once-ui-system/core";
import { createTournamentAction, CreateTournamentFormState } from "./actions";

const initialState: CreateTournamentFormState = { error: null };

const ROUND_OPTIONS = [
  { value: "2", label: "2" },
  { value: "3", label: "3" },
  { value: "4", label: "4" },
  { value: "5", label: "5" },
  { value: "6", label: "6" },
  { value: "7", label: "7" },
  { value: "8", label: "8" },
  { value: "more", label: "9+" },
];

const TOP_CUT_OPTIONS = [
  { value: "none", label: "Sin" },
  { value: "4", label: "4" },
  { value: "8", label: "8" },
  { value: "16", label: "16" },
  { value: "32", label: "32" },
];

const PAIRING_MODE_OPTIONS = [
  { value: "automatic", label: "Automático" },
  { value: "manual", label: "Manual · auditoría" },
];

/**
 * Once UI's SegmentedControl renders each option as a <button> without a
 * `type` attribute. Inside a <form>, a button without `type` defaults to
 * `type="submit"` (HTML spec), so a plain click on any option would submit
 * the form and create the tournament immediately. Injecting `type="button"`
 * into every option keeps the clicks local: only the real submit button can
 * submit the form.
 */
const formOptions = (options: { value: string; label: string }[]) =>
  options.map((option) => ({ ...option, type: "button" as const }));

type PairingMode = "automatic" | "manual";

interface KonamiReferenceRow {
  min: number;
  max: number | null;
  rounds: number;
  topCut: number | null;
  /** Tier 3-4 only: Swiss rounds played on day 1 and day 2. */
  day1Rounds?: number;
  day2Rounds?: number;
}

type KonamiTier = "tier1-2" | "tier3-4";

/**
 * Official Yu-Gi-Oh! TCG Tournament Policy v2.5 (effective Sept 5, 2025).
 * Required Swiss rounds and optional playoff top cut based on the number of
 * enrolled Duelists once registration closes.
 */
const KONAMI_TIER_1_2: KonamiReferenceRow[] = [
  { min: 4, max: 8, rounds: 3, topCut: null },
  { min: 9, max: 16, rounds: 4, topCut: 4 },
  { min: 17, max: 32, rounds: 5, topCut: 4 },
  { min: 33, max: 64, rounds: 6, topCut: 8 },
  { min: 65, max: 128, rounds: 7, topCut: 8 },
  { min: 129, max: 256, rounds: 8, topCut: 8 },
  { min: 257, max: 512, rounds: 9, topCut: 8 },
  { min: 513, max: 1024, rounds: 10, topCut: 8 },
  { min: 1025, max: 2048, rounds: 11, topCut: 8 },
  { min: 2049, max: null, rounds: 12, topCut: 8 },
];

const KONAMI_TIER_3_4: KonamiReferenceRow[] = [
  { min: 129, max: 256, rounds: 11, topCut: 8, day1Rounds: 7, day2Rounds: 4 },
  { min: 257, max: 512, rounds: 12, topCut: 8, day1Rounds: 8, day2Rounds: 4 },
  { min: 513, max: 1024, rounds: 13, topCut: 8, day1Rounds: 8, day2Rounds: 5 },
  { min: 1025, max: 2048, rounds: 14, topCut: 8, day1Rounds: 9, day2Rounds: 5 },
  { min: 2049, max: null, rounds: 15, topCut: 8, day1Rounds: 9, day2Rounds: 6 },
];

function findKonamiReference(
  players: number,
  tier: KonamiTier,
): KonamiReferenceRow | null {
  if (!Number.isFinite(players) || players < 4) return null;
  const table = tier === "tier1-2" ? KONAMI_TIER_1_2 : KONAMI_TIER_3_4;
  return (
    table.find(
      (row) => players >= row.min && (row.max === null || players <= row.max),
    ) ?? null
  );
}

export const CreateTournamentForm = () => {
  const [state, formAction, isPending] = useActionState(
    createTournamentAction,
    initialState,
  );
  const [rounds, setRounds] = useState(4);
  const [topCut, setTopCut] = useState<number | null>(null);
  const [pairingMode, setPairingMode] = useState<PairingMode>("automatic");
  const [useLegacyRuleset, setUseLegacyRuleset] = useState(false);
  const [expectedPlayers, setExpectedPlayers] = useState("");
  const [konamiTier, setKonamiTier] = useState<KonamiTier>("tier1-2");
  const expectedPlayersRef = useRef<HTMLInputElement>(null);

  const roundsValue = rounds <= 8 ? String(rounds) : "more";
  const topCutValue = topCut === null ? "none" : String(topCut);

  const isTier34 = konamiTier === "tier3-4";
  const konamiTable = isTier34 ? KONAMI_TIER_3_4 : KONAMI_TIER_1_2;
  const playersCount = Number(expectedPlayers);
  const recommendation =
    expectedPlayers.trim() !== "" && Number.isFinite(playersCount)
      ? findKonamiReference(playersCount, konamiTier)
      : null;
  const tooFewPlayers =
    expectedPlayers.trim() !== "" &&
    Number.isFinite(playersCount) &&
    playersCount >= 1 &&
    playersCount < (isTier34 ? 129 : 4);

  const handleRoundsToggle = (value: string) => {
    if (value === "more") {
      setRounds((current) => (current > 8 ? current : 9));
    } else {
      setRounds(Number(value));
    }
  };

  const handleTopCutToggle = (value: string) => {
    setTopCut(value === "none" ? null : Number(value));
  };

  return (
    <Column
      maxWidth={40}
      gap="24"
      padding="32"
      radius="l"
      border
      background="surface"
    >
      <Column gap="8">
        <Heading as="h1" variant="heading-strong-l">
          Crear torneo
        </Heading>
        <Text onBackground="neutral-weak">
          En menos de un minuto. Los jugadores se registran después.
        </Text>
      </Column>

      <form action={formAction}>
        {/* Hidden fields carry the segmented-control values into the server action. */}
        <input type="hidden" name="totalSwissRounds" value={String(rounds)} />
        <input
          type="hidden"
          name="topCutSize"
          value={topCut === null ? "" : String(topCut)}
        />
        <input type="hidden" name="pairingMode" value={pairingMode} />
        <Column gap="20">
          <Column gap="16">
            <Input
              id="name"
              name="name"
              label="Nombre del torneo"
              placeholder="Ej: Regional de Primavera"
              required
              autoFocus
            />

            <Column gap="8">
              <Text variant="label-default-s" onBackground="neutral-weak">
                Rondas suizas
              </Text>
              <SegmentedControl
                buttons={formOptions(ROUND_OPTIONS)}
                selected={roundsValue}
                onToggle={handleRoundsToggle}
              />
              {rounds > 8 && (
                <Input
                  id="customRounds"
                  label="Rondas personalizadas"
                  type="number"
                  min={1}
                  max={20}
                  value={rounds}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    setRounds(
                      Number.isFinite(value)
                        ? Math.min(20, Math.max(1, value))
                        : 1,
                    );
                  }}
                />
              )}
            </Column>

            <Column gap="8">
              <Text variant="label-default-s" onBackground="neutral-weak">
                Top cut
              </Text>
              <SegmentedControl
                buttons={formOptions(TOP_CUT_OPTIONS)}
                selected={topCutValue}
                onToggle={handleTopCutToggle}
              />
            </Column>

            <Column gap="8">
              <Text variant="label-default-s" onBackground="neutral-weak">
                Emparejamiento
              </Text>
              <SegmentedControl
                buttons={formOptions(PAIRING_MODE_OPTIONS)}
                selected={pairingMode}
                onToggle={(value) => setPairingMode(value as PairingMode)}
              />
              {pairingMode === "manual" && (
                <Text variant="body-default-xs" onBackground="neutral-weak">
                  Modo auditoría: la ronda 1 se carga manualmente con las
                  parejas reales del evento. Las rondas siguientes se emparejan
                  solas.
                </Text>
              )}
            </Column>
          </Column>

          <Accordion title="Referencia oficial (Konami)" size="s">
            <Column gap="16">
              <Text variant="body-default-s" onBackground="neutral-weak">
                Rondas suizas y top cut según la política oficial v2.5
                (septiembre 2025), según la cantidad de jugadores inscritos al
                cerrar la inscripción.
              </Text>

              <SegmentedControl
                buttons={formOptions([
                  { value: "tier1-2", label: "Tier 1-2 · Local/Regional" },
                  { value: "tier3-4", label: "Tier 3-4 · YCS/WCQ" },
                ])}
                selected={konamiTier}
                onToggle={(value) => setKonamiTier(value as KonamiTier)}
              />

              <Column gap="8">
                <InteractiveDetails
                  label="Jugadores esperados"
                  description="Ingresá la cantidad estimada para ver la recomendación oficial."
                  iconButtonProps={{
                    tooltip:
                      "La cantidad de rondas se define al cerrar la inscripción.",
                    tooltipPosition: "right",
                  }}
                  onClick={() => expectedPlayersRef.current?.focus()}
                />
                <Input
                  id="expectedPlayers"
                  type="number"
                  min={4}
                  placeholder="Ej: 24"
                  value={expectedPlayers}
                  onChange={(event) => setExpectedPlayers(event.target.value)}
                  ref={expectedPlayersRef}
                />
              </Column>

              {recommendation && (
                <Row
                  gap="12"
                  vertical="center"
                  wrap
                  fillWidth
                  padding="12"
                  radius="m"
                  border
                >
                  <Icon name="info" size="xs" onBackground="brand-medium" />
                  <Text variant="body-default-s">
                    Konami recomienda{" "}
                    <Text as="span" variant="body-strong-s">
                      {recommendation.rounds} rondas
                    </Text>
                    {isTier34 && (
                      <>
                        {" "}
                        (
                        <Text as="span" variant="body-strong-s">
                          {recommendation.day1Rounds}
                        </Text>{" "}
                        el día 1,{" "}
                        <Text as="span" variant="body-strong-s">
                          {recommendation.day2Rounds}
                        </Text>{" "}
                        el día 2)
                      </>
                    )}{" "}
                    {recommendation.topCut === null ? (
                      "sin top cut"
                    ) : (
                      <>
                        con{" "}
                        <Text as="span" variant="body-strong-s">
                          Top {recommendation.topCut}
                        </Text>
                      </>
                    )}
                  </Text>
                  <Button
                    type="button"
                    size="s"
                    variant="secondary"
                    onClick={() => {
                      setRounds(recommendation.rounds);
                      setTopCut(recommendation.topCut);
                    }}
                  >
                    Usar esta configuración
                  </Button>
                </Row>
              )}

              {tooFewPlayers && (
                <Text variant="body-default-s" onBackground="neutral-weak">
                  {isTier34
                    ? "Tier 3-4 aplica a eventos de 129 o más jugadores."
                    : "Konami no define rondas para menos de 4 jugadores."}
                </Text>
              )}

              <Table
                data={{
                  headers: isTier34
                    ? [
                        { content: "Jugadores", key: "players" },
                        { content: "Rondas suizas", key: "rounds" },
                        { content: "Día 1", key: "day1" },
                        { content: "Día 2", key: "day2" },
                        { content: "Top cut", key: "topCut" },
                      ]
                    : [
                        { content: "Jugadores", key: "players" },
                        { content: "Rondas suizas", key: "rounds" },
                        { content: "Top cut", key: "topCut" },
                      ],
                  rows: konamiTable.map((row) => {
                    const isMatch = recommendation?.min === row.min;
                    const cellProps: {
                      variant: "body-strong-s" | "body-default-s";
                      onBackground: "brand-strong" | undefined;
                    } = {
                      variant: isMatch ? "body-strong-s" : "body-default-s",
                      onBackground: isMatch ? "brand-strong" : undefined,
                    };
                    return [
                      <Text key="players" {...cellProps}>
                        {row.max === null
                          ? `${row.min}+`
                          : `${row.min}–${row.max}`}
                      </Text>,
                      <Text key="rounds" {...cellProps}>
                        {row.rounds}
                      </Text>,
                      ...(isTier34
                        ? [
                            <Text key="day1" {...cellProps}>
                              {row.day1Rounds}
                            </Text>,
                            <Text key="day2" {...cellProps}>
                              {row.day2Rounds}
                            </Text>,
                          ]
                        : []),
                      <Text key="topCut" {...cellProps}>
                        {row.topCut === null ? "Ninguno" : `Top ${row.topCut}`}
                      </Text>,
                    ];
                  }),
                }}
              />

              {isTier34 && (
                <Column gap="4" padding="12" radius="m" border>
                  <Text variant="body-default-s">Ajuste por BYEs</Text>
                  <Text variant="body-default-xs" onBackground="neutral-weak">
                    Los BYEs suman duelistas adicionales al total para calcular
                    las rondas: 1 BYE = +1 por duelista, 2 BYEs = +3 por
                    duelista, 3 BYEs = +7 por duelista.
                  </Text>
                  <Text variant="body-default-xs" onBackground="neutral-weak">
                    Ejemplo: 1.000 duelistas + 5 con BYE de 2 rondas = 1.020
                    (1.000 + 5 + 3×5).
                  </Text>
                </Column>
              )}
            </Column>
          </Accordion>

          <Row
            gap="8"
            vertical="center"
            wrap
            fillWidth
            padding="12"
            radius="m"
            border
          >
            <Icon name="info" size="xs" onBackground="neutral-weak" />
            <Text variant="body-strong-s">
              {rounds} {rounds === 1 ? "ronda" : "rondas"}
            </Text>
            <Text variant="body-default-s" onBackground="neutral-weak">
              ·
            </Text>
            <Text variant="body-strong-s">
              {topCut === null ? "Sin top cut" : `Top ${topCut}`}
            </Text>
            <Text variant="body-default-s" onBackground="neutral-weak">
              ·
            </Text>
            <Text variant="body-strong-s">
              {useLegacyRuleset ? "Empates permitidos" : "Sin empates"}
            </Text>
            <Text variant="body-default-s" onBackground="neutral-weak">
              ·
            </Text>
            <Text variant="body-strong-s">
              {pairingMode === "manual"
                ? "Ronda 1 manual"
                : "Emparejamiento automático"}
            </Text>
          </Row>

          <Row
            gap="12"
            vertical="center"
            fillWidth
            padding="16"
            radius="m"
            border
          >
            <Switch
              id="useLegacyRuleset"
              name="useLegacyRuleset"
              isChecked={useLegacyRuleset}
              onToggle={() => setUseLegacyRuleset((value) => !value)}
            />
            <Column gap="2">
              <Text variant="body-default-s">Permitir empates</Text>
              <Text variant="body-default-xs" onBackground="neutral-weak">
                Apagado por defecto, como en la política vigente de Konami.
                Activado, un empate otorga 1 punto a cada jugador.
              </Text>
            </Column>
          </Row>

          {state.error && (
            <Row
              gap="8"
              vertical="center"
              fillWidth
              padding="12"
              radius="m"
              background="danger-alpha-weak"
            >
              <Icon name="danger" size="xs" onBackground="danger-strong" />
              <Text onBackground="danger-weak" variant="body-default-s">
                {state.error}
              </Text>
            </Row>
          )}

          <Button
            type="submit"
            fillWidth
            disabled={isPending}
            prefixIcon="plus"
          >
            {isPending ? "Creando..." : "Crear torneo"}
          </Button>
        </Column>
      </form>
    </Column>
  );
};

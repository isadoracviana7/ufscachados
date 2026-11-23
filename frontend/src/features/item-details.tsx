import { logo } from "@/data/assets";
import { useEffect, useState } from "react";
import {
  CalendarDays,
  MapPin,
  Tag,
  ShieldCheck,
  ArrowRight,
  Check,
  LockKeyhole,
  MessageCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { canReturn, type Item, type RecordData } from "@/data/types";
import {
  closeLost,
  createClaim,
  decideClaim,
  getSecret,
  listResource,
  conferClaim,
} from "@/services/api";
import { useApp } from "./app-context";
import { ErrorMessage, Field, formatDate, Processing } from "./common";

export function ItemDetails({ item, onClose }: { item: Item; onClose: () => void }) {
  const { role, currentUser, refresh, connection } = useApp();
  const [step, setStep] = useState<"detail" | "claim" | "return" | "found">("detail");
  const [secret, setSecret] = useState("");
  const [justification, setJustification] = useState("");
  const [name, setName] = useState("");
  const [registration, setRegistration] = useState("");
  const [validated, setValidated] = useState(false);
  const [checked, setChecked] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [claims, setClaims] = useState<RecordData[]>([]);
  const [claimId, setClaimId] = useState("");
  const [comparison, setComparison] = useState("");

  useEffect(() => {
    if (role === "operador") {
      const activeOperatorId = currentUser?.id ?? 2;
      void getSecret(item.id, activeOperatorId)
        .then((val) => setSecret(val))
        .catch((e) => setError(String(e)));

      void listResource("reivindicacoes")
        .then((rows) => {
          const matching = rows.filter(
            (r) => r["id_objeto"] === item.id && r["status"] === "EM_ANALISE",
          );
          setClaims(matching);
          if (matching[0]) setClaimId(String(matching[0]["id_reivindicacao"]));
        })
        .catch((e) => setError(String(e)));
    } else {
      // Garante que o estado fique limpo caso não seja operador
      setSecret("");
    }
  }, [role, item.id, currentUser?.id]);

  async function validateRegistration() {
    setError("");
    try {
      const members = await listResource("usuarios/membro-ufsc");
      const users = await listResource("usuarios");
      const member = members.find((r) => String(r["matricula_ufsc"]) === registration);
      const user = users.find((r) => r["id_usuario"] === member?.["id_usuario"]);
      if (!member || !user) {
        setError("Matrícula não encontrada nos membros UFSC cadastrados.");
        return;
      }
      setName(String(user["name"] ?? user["nome"] ?? ""));
      setValidated(true);
      toast.success("Matrícula conferida. Confirme a propriedade presencialmente.");
    } catch (e) {
      setError(String(e));
    }
  }

  async function submitClaim() {
    setError("");
    setBusy(true);
    try {
      const activeUserId = currentUser?.id ?? 1;
      await createClaim(item.id, activeUserId, justification);
      await refresh();
      toast.success("Solicitação enviada ao Protocolo.");
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function complete(approved = true) {
    setError("");
    setBusy(true);
    try {
      const activeOperatorId = currentUser?.id ?? 2;
      if (step === "found") await closeLost(item, reason, activeOperatorId);
      else {
        let id = Number(claimId);
        if (!id) {
          const members = await listResource("usuarios/membro-ufsc");
          const member = members.find((r) => String(r["matricula_ufsc"]) === registration);
          if (!member) throw new Error("Confira a matrícula antes de continuar.");
          const claim = await createClaim(item.id, Number(member["id_usuario"]), justification);
          id = Number(claim["id_reivindicacao"]);
        }
        const operatorName = currentUser?.name ?? "Operador do Protocolo";
        await decideClaim(
          id,
          approved,
          `Conferência presencial por ${operatorName}. Dono: ${name}. Matrícula: ${registration}. ${justification}`,
          activeOperatorId,
        );
      }
      await refresh();
      toast.success(
        step === "found"
          ? "Objeto marcado como encontrado."
          : approved
            ? "Devolução registrada com sucesso."
            : "Reivindicação rejeitada.",
      );
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const canComplete =
    canReturn(name, registration, checked, validated) &&
    (!!claimId || justification.trim().length >= 5);

  return (
    <>
      <Dialog
        open
        onOpenChange={(open) => {
          if (!open && !busy) onClose();
        }}
      >
        <DialogContent
          className={`modal-content ${step === "detail" ? "sm:max-w-[800px]" : "sm:max-w-lg"}`}
        >
          <DialogTitle className="sr-only">
            {step === "detail"
              ? item.title
              : step === "claim"
                ? "Solicitar retirada"
                : step === "found"
                  ? "Objeto encontrado"
                  : "Registrar devolução"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Informações e atendimento do objeto {item.title}.
          </DialogDescription>
          {step === "detail" ? (
            <div className="detail-grid">
              <div className="detail-photo">
                <img src={item.image || logo} alt={item.title} />
              </div>
              <div className="detail-info">
                <div className="detail-status">
                  <span className="connection-dot" />
                  {item.type === "achado" ? "Achado · Aguardando retirada" : "Perdido · Procurando"}
                </div>
                <h2>{item.title}</h2>
                <div className="detail-meta">
                  <MapPin />
                  <div>
                    <span>LOCAL</span>
                    {item.location}
                  </div>
                </div>
                <div className="detail-meta">
                  <Tag />
                  <div>
                    <span>CATEGORIA</span>
                    {item.category}
                  </div>
                </div>
                <div className="detail-description">
                  <strong>SOBRE O OBJETO</strong>
                  {item.description}
                </div>
                {role === "operador" && (
                  <div className="notice">
                    <LockKeyhole />
                    <div>
                      <strong className="block mb-1">Dado de validação · Restrito</strong>
                      {secret || "Consultando detalhe de segurança..."}
                    </div>
                  </div>
                )}
                <div className="detail-date flex items-center gap-2">
                  <CalendarDays size={13} />
                  Registrado em {formatDate(item.date)} · #{item.id}
                </div>
                {role === "operador" ? (
                  <Button
                    className="bg-success text-primary-foreground hover:bg-success/90"
                    onClick={() => setStep(item.type === "achado" ? "return" : "found")}
                  >
                    <Check />
                    {item.type === "achado" ? "Devolvido" : "Encontrado"}
                  </Button>
                ) : role === "usuario" && item.type === "achado" ? (
                  <Button onClick={() => setStep("claim")}>
                    Este item é meu <ArrowRight />
                  </Button>
                ) : role === "visitante" ? (
                  <Button variant="outline" asChild>
                    <Link to="/acesso">
                      Entrar para entrar em contato <ArrowRight />
                    </Link>
                  </Button>
                ) : (
                  <p className="modal-subtitle">
                    Procure o Protocolo caso tenha informações sobre este objeto.
                  </p>
                )}
              </div>
            </div>
          ) : step === "claim" ? (
            <div className="form-stack">
              <MessageCircle className="text-primary" size={30} />
              <h2 className="modal-title">Encontrou o que é seu?</h2>
              <p className="modal-subtitle">
                Descreva um detalhe que só o dono de <strong>{item.title}</strong> saberia. O
                Protocolo conferirá sua solicitação.
              </p>
              <Field label="Detalhe de identificação *">
                <textarea
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  placeholder="Marca, conteúdo, adesivo ou outra característica particular..."
                  minLength={5}
                />
              </Field>
              <div className="notice">
                <ShieldCheck />A retirada é presencial, mediante comprovação de propriedade.
              </div>
              <ErrorMessage message={error} />
              <Button
                disabled={justification.trim().length < 5 || busy}
                onClick={() => void submitClaim()}
              >
                Enviar solicitação <ArrowRight />
              </Button>
            </div>
          ) : step === "found" ? (
            <div className="form-stack">
              <h2 className="modal-title">Mais um reencontro!</h2>
              <p className="modal-subtitle">
                Como o objeto <strong>{item.title}</strong> foi encontrado?
              </p>
              {[
                [
                  "externo",
                  "O objeto foi encontrado por meios externos e a publicação se torna desnecessária.",
                ],
                [
                  "plataforma",
                  "O objeto foi encontrado pela plataforma 'UFSCachados' e a publicação não se faz mais necessária.",
                ],
              ].map(([value, label]) => (
                <label className="checkbox-row" key={value}>
                  <input
                    type="radio"
                    name="reason"
                    value={value}
                    checked={reason === value}
                    onChange={() => setReason(value ?? "")}
                  />
                  {label}
                </label>
              ))}
              <ErrorMessage message={error} />
              <Button disabled={!reason || busy} onClick={() => void complete()}>
                <Check />
                Encontrado
              </Button>
            </div>
          ) : (
            <div className="form-stack">
              <h2 className="modal-title">Registrar devolução</h2>
              <p className="modal-subtitle">{item.title} · Conferência presencial no Protocolo</p>
              {claims.length > 0 && (
                <Field label="Solicitação em análise">
                  <select
                    value={claimId}
                    onChange={async (e) => {
                      setClaimId(e.target.value);
                      const c = await conferClaim(
                        Number(e.target.value),
                        currentUser?.id ?? 2,
                      );
                      setSecret(c.comparacao_seguranca.segredo_real_cadastrado);
                      setComparison(c.comparacao_seguranca.justificativa_informada_pelo_usuario);
                    }}
                  >
                    {claims.map((c) => (
                      <option
                        key={String(c["id_reivindicacao"])}
                        value={String(c["id_reivindicacao"])}
                      >
                        Solicitação #{String(c["id_reivindicacao"])} · usuário #
                        {String(c["id_usuario"])}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
              <Field label="Nome do dono *">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nome completo"
                  required
                />
              </Field>
              <Field label="Matrícula UFSC *">
                <div className="flex gap-2">
                  <input
                    inputMode="numeric"
                    value={registration}
                    onChange={(e) => {
                      setRegistration(e.target.value.replace(/\D/g, ""));
                      setValidated(false);
                    }}
                    placeholder={connection === "demo" ? "Ex.: 20231045" : "Matrícula UFSC"}
                  />
                  <Button
                    variant="outline"
                    disabled={!registration}
                    onClick={() => void validateRegistration()}
                  >
                    Validar
                  </Button>
                </div>
              </Field>
              {validated && (
                <p className="text-xs success-text flex items-center gap-2">
                  <ShieldCheck size={14} />
                  Matrícula conferida{connection === "demo" ? " (simulação idUFSC)" : ""}
                </p>
              )}
              <div className="notice">
                <LockKeyhole />
                <div>
                  <strong className="block">Dado de validação</strong>
                  {secret}
                  {comparison && <p className="mt-2">Informado pelo solicitante: {comparison}</p>}
                </div>
              </div>
              {!claimId && (
                <Field label="Detalhe informado pelo dono *">
                  <textarea
                    value={justification}
                    onChange={(e) => setJustification(e.target.value)}
                    placeholder="Registre a prova de propriedade apresentada."
                    minLength={5}
                  />
                </Field>
              )}
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => setChecked(e.target.checked)}
                />
                O usuário comprovou a propriedade do objeto.
              </label>
              <ErrorMessage message={error} />
              <div className="flex gap-2">
                {claimId && (
                  <Button variant="outline" disabled={busy} onClick={() => void complete(false)}>
                    Rejeitar solicitação
                  </Button>
                )}
                <Button
                  disabled={!canComplete || busy}
                  className="flex-1 bg-success text-primary-foreground hover:bg-success/90"
                  onClick={() => void complete()}
                >
                  <Check />
                  Devolvido
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      {busy && <Processing />}
    </>
  );
}

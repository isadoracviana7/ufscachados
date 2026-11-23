import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, UploadCloud, Star, Plus, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useApp } from "@/features/app-context";
import { ErrorMessage, Field, metadata, Processing } from "@/features/common";
import { canPublish, type Item, type RecordData } from "@/data/types";
import { createItem, listResource, operation } from "@/services/api";

export const Route = createFileRoute("/publicar")({
  head: () =>
    metadata(
      "Publicar registro",
      "Registre um objeto perdido ou encontrado no campus da UFSC com segurança e privacidade.",
    ),
  component: Publish,
});

function Publish() {
  const { role, currentUser, items, refresh } = useApp();
  const navigate = useNavigate();
  const [type, setType] = useState<"achado" | "perdido">("perdido");
  const [photo, setPhoto] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [consent, setConsent] = useState(false);
  const [categories, setCategories] = useState<RecordData[]>([]);
  const [locations, setLocations] = useState<RecordData[]>([]);
  const [colors, setColors] = useState<RecordData[]>([]);

  useEffect(() => {
    void Promise.all([listResource("categorias"), listResource("locais"), listResource("cores")])
      .then(([c, l, co]) => {
        setCategories(c);
        setLocations(l);
        setColors(co);
      })
      .catch((e) => setError(String(e)));
  }, []);

  async function upload(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Selecione uma imagem JPG, PNG ou WebP.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("A imagem deve ter até 10 MB.");
      return;
    }
    try {
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, 700 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      setPhoto(canvas.toDataURL("image/jpeg", 0.8));
      bitmap.close();
      setError("");
    } catch {
      setError("Não foi possível abrir esta imagem. Tente JPG ou PNG.");
    }
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canPublish(role) || !consent) return;
    const form = new FormData(e.currentTarget);
    const title = String(form.get("title") ?? "").trim();
    const description = String(form.get("description") ?? "").trim();
    const secret = String(form.get("secret") ?? "").trim();
    if (title.length < 3 || description.length < 10 || secret.length < 3) {
      setError(
        "Informe o objeto (3 caracteres), uma descrição pública (10 caracteres) e o detalhe privado (3 caracteres).",
      );
      return;
    }
    const categoryId = Number(form.get("category"));
    const localId = Number(form.get("local"));
    const now = new Date();
    const expiry = new Date(now);
    expiry.setDate(expiry.getDate() + 90);

    const activeUserId = currentUser?.id ?? (role === "operador" ? 2 : 1);

    const item: Item = {
      id: Math.max(99, ...items.map((i) => i.id)) + 1,
      title,
      description,
      categoryId,
      localId,
      colorId: Number(form.get("color")),
      category: String(categories.find((c) => c["id_categoria"] === categoryId)?.["nome"] ?? ""),
      location: String(locations.find((l) => l["id_local"] === localId)?.["nome"] ?? ""),
      date: now.toISOString().slice(0, 10),
      expires: expiry.toISOString().slice(0, 10),
      image: photo,
      type,
      status: type === "achado" ? 1 : 5,
      userId: activeUserId,
    };

    setBusy(true);
    setError("");
    try {
      await createItem(item, secret);
      if (type === "achado")
        await operation(`/operacoes/executar-match/${item.id}`).catch(() =>
          toast.warning(
            "Registro salvo, mas não foi possível executar a correspondência automática.",
          ),
        );
      await refresh();
      toast.success("Registro publicado. Obrigado por ajudar!");
      await navigate({ to: "/" });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  if (!canPublish(role))
    return (
      <main className="page-width main-content">
        <div className="empty-state">
          <ShieldCheck size={40} />
          <h3>Faça parte deste reencontro.</h3>
          <p>Entre com um perfil UFSC para publicar um registro.</p>
          <Button className="mt-5" asChild>
            <Link to="/acesso">Entrar com idUFSC</Link>
          </Button>
        </div>
      </main>
    );

  return (
    <main className="page-width main-content">
      <div className="max-w-2xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 text-xs text-muted-foreground mb-7">
          <ArrowLeft size={14} />
          Voltar ao mural
        </Link>
        <div className="eyebrow">Um gesto de cuidado</div>
        <h1 className="page-title">Publicar um registro</h1>
        <p className="page-description mb-7">
          Quanto mais informações públicas, mais perto de um reencontro.
        </p>
        <form className="form-stack" onSubmit={(e) => void submit(e)}>
          <div className="flex gap-2 p-1 rounded-lg bg-card border border-border w-fit">
            {(["perdido", "achado"] as const).map((t) => (
              <Button
                key={t}
                type="button"
                variant={type === t ? "default" : "ghost"}
                onClick={() => setType(t)}
                className="rounded-full px-8"
              >
                {type === t && <span className="size-2 bg-current rounded-full" />}
                {t === "perdido" ? "Perdido" : "Achado"}
              </Button>
            ))}
          </div>
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-medium">Foto do objeto</span>
              <span className="text-[10px] text-muted-foreground">Opcional · até 10 MB</span>
            </div>
            <label className="upload-zone">
              {photo ? (
                <img src={photo} alt="Prévia da foto do objeto" />
              ) : (
                <>
                  <UploadCloud size={29} className="text-primary" />
                  <strong className="text-foreground text-xs">Adicionar uma foto</strong>
                  <span className="text-[10px]">JPG, PNG ou WebP</span>
                </>
              )}
              <input
                className="sr-only"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                aria-label="Foto do objeto"
                onChange={(e) => void upload(e.target.files?.[0])}
              />
            </label>
            {photo && (
              <Button type="button" variant="ghost" size="sm" onClick={() => setPhoto("")}>
                <X />
                Remover foto
              </Button>
            )}
          </div>
          <div className="notice">
            <Star />
            <div>
              <strong>Se está registrando um achado, omita detalhes de segurança.</strong>
              <br />
              Guarde marcas particulares, nomes e conteúdos para a validação privada.
            </div>
          </div>
          <Field label="Objeto *">
            <input
              name="title"
              required
              minLength={3}
              maxLength={80}
              placeholder="Ex.: Garrafa térmica preta"
            />
          </Field>
          <div className="form-grid">
            <Field label="Categoria *">
              <select name="category" required defaultValue="">
                <option value="" disabled>
                  Selecione
                </option>
                {categories.map((c) => (
                  <option key={String(c["id_categoria"])} value={String(c["id_categoria"])}>
                    {String(c["nome"])}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Cor *">
              <select name="color" required defaultValue="">
                <option value="" disabled>
                  Selecione
                </option>
                {colors.map((c) => (
                  <option key={String(c["id_cor"])} value={String(c["id_cor"])}>
                    {String(c["nome"])}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Local *">
            <select name="local" required defaultValue="">
              <option value="" disabled>
                Onde o objeto foi {type === "achado" ? "encontrado" : "perdido"}?
              </option>
              {locations.map((l) => (
                <option key={String(l["id_local"])} value={String(l["id_local"])}>
                  {String(l["nome"])}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Descrição pública *">
            <textarea
              name="description"
              required
              minLength={10}
              placeholder="Descreva o objeto, quando e onde ele foi visto..."
            />
          </Field>
          <Field label="Detalhe de segurança oculto *">
            <textarea
              name="secret"
              required
              minLength={3}
              placeholder="Uma informação que só o dono saberia. Não será exibida no mural."
            />
          </Field>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              required
            />
            Concordo que meu nome e e-mail sejam anexados aos dados da publicação para fins de
            contato e acesso do operador do protocolo.
          </label>
          <ErrorMessage message={error} />
          <Button type="submit" className="h-12" disabled={!consent || busy}>
            <Plus />
            Publicar Registro
          </Button>
        </form>
      </div>
      {busy && <Processing publication />}
    </main>
  );
}

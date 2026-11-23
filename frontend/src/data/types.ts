export type Role = "visitante" | "usuario" | "operador";
export type RecordData = Record<string, string | number | boolean | null>;
export interface Item {
  id: number;
  title: string;
  description: string;
  category: string;
  location: string;
  date: string;
  image: string;
  type: "achado" | "perdido";
  status: number;
  categoryId: number;
  localId: number;
  colorId: number;
  userId: number;
  expires: string | null;
}
export interface Match {
  id_objeto: number;
  grau_compatibilidade: string;
  justificativa: string;
}
export const canPublish = (role: Role) => role !== "visitante";
export const canOperate = (role: Role) => role === "operador";
export const isPublic = (item: Pick<Item, "status">) => [1, 2, 5].includes(item.status);
export const canReturn = (
  name: string,
  registration: string,
  checked: boolean,
  validated: boolean,
) => name.trim().length >= 2 && /^\d+$/.test(registration) && checked && validated;
export const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

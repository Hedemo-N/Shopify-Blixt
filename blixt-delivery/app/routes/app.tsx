import { redirect } from "@remix-run/node";

export function loader() {
  return redirect("/");
}

export default function AppAlias() {
  return null;
}

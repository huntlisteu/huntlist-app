import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[#F2EDE3] dark:bg-[#111210] px-4">
      <div className="w-full max-w-sm text-center">
        <p className="font-sans text-xs font-bold uppercase tracking-widest text-[#8A8A82] dark:text-[#5A5A54]">
          Errore
        </p>
        <h1 className="mt-2 font-heading text-8xl text-[#1A1A18] dark:text-[#F0EFE8]">
          404
        </h1>
        <p className="mt-2 font-heading text-xl text-[#1A1A18] dark:text-[#F0EFE8]">
          Questa pagina non esiste.
        </p>
        <p className="mt-2 font-sans text-sm text-[#4A4A44] dark:text-[#B0AFA8]">
          La Hunt che cerchi è andata perduta.
        </p>
        <Link
          href="/feed"
          className="mt-8 inline-flex items-center justify-center rounded-[4px] border-2 border-[#1A1A18] dark:border-[#3A3D38] bg-[#6DBE00] dark:bg-[#9ADE00] px-6 py-3 font-sans font-bold text-[#1A1A18] shadow-[4px_4px_0px_#1A1A18] dark:shadow-[4px_4px_0px_#3A3D38] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0px_#1A1A18] dark:hover:shadow-[2px_2px_0px_#3A3D38] transition-all"
        >
          Torna al feed
        </Link>
      </div>
    </div>
  );
}

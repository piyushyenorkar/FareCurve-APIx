import "@/styles/globals.css";
import type { AppProps } from "next/app";
import Sidebar from "@/components/Sidebar";
import Head from "next/head";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>SkyIndex Dashboard</title>
      </Head>
      <div className="min-h-screen bg-[#fafafa] flex font-sans text-gray-900">
        <Sidebar />
        <main className="flex-1 p-8 ml-64 overflow-y-auto relative z-10">
          {/* Background Aviation Elements */}
          <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
             {/* Photographic Plane Background */}
             <div className="absolute inset-0 bg-[url('/bg_plane.jpg')] bg-cover bg-center bg-no-repeat opacity-90"></div>
             {/* Light gradient overlay for text readability */}
             <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px]"></div>
             <div className="absolute inset-0 bg-gradient-to-b from-white/70 via-white/20 to-white/70"></div>
             
             
          </div>
          <div className="relative z-20 max-w-7xl mx-auto">
              <Component {...pageProps} />
          </div>
        </main>
      </div>
    </>
  );
}

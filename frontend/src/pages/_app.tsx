import "@/styles/globals.css";
import type { AppProps } from "next/app";
import Sidebar from "@/components/Sidebar";
import Head from "next/head";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>APIx Dashboard</title>
      </Head>
      <div className="min-h-screen bg-[#fafafa] flex font-sans text-gray-900">
        <Sidebar />
        <main className="flex-1 p-8 ml-64 overflow-y-auto relative z-10">
          {/* Background Aviation Elements */}
          <div className="pointer-events-none fixed inset-0 opacity-[0.03] z-0 overflow-hidden">
             <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                <path d="M-100,600 Q400,100 900,400 T1900,100" fill="none" stroke="#6366f1" strokeWidth="3" strokeDasharray="12,12" />
             </svg>
          </div>
          <div className="relative z-20 max-w-7xl mx-auto">
              <Component {...pageProps} />
          </div>
        </main>
      </div>
    </>
  );
}

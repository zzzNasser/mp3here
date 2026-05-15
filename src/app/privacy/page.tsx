import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-neutral-100 px-4 py-6 text-neutral-950 sm:px-6 lg:py-10">
      <article className="mx-auto max-w-3xl rounded-lg border border-neutral-300 bg-white p-6 shadow-sm sm:p-8">
        <Link className="text-sm font-semibold text-neutral-600 underline-offset-4 hover:underline" href="/">
          Back to Mp3Here
        </Link>

        <h1 className="mt-6 text-3xl font-bold">Privacy Policy</h1>
        <p className="mt-3 text-sm leading-6 text-neutral-600">
          Mp3Here processes the links you submit so it can inspect media, create downloads, and show recent files stored on
          this device or server. Do not submit private links or content that you are not allowed to access.
        </p>

        <section className="mt-8 space-y-3">
          <h2 className="text-lg font-bold">Advertising</h2>
          <p className="text-sm leading-6 text-neutral-600">
            This site may show third-party advertising. Advertising partners, including Google AdSense when configured, may
            use cookies, web beacons, IP addresses, and similar technologies to measure ads, prevent fraud, and personalize
            or limit advertising depending on your settings and local law.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-lg font-bold">Downloaded files</h2>
          <p className="text-sm leading-6 text-neutral-600">
            Downloaded media and cover artwork are stored under the site&apos;s public downloads folder so the app can serve
            them back to you. Clear that folder and the history file if you do not want old downloads to remain available.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-lg font-bold">Responsible use</h2>
          <p className="text-sm leading-6 text-neutral-600">
            Use Mp3Here only for media you own, have permission to use, or are legally allowed to archive. Requests that
            violate copyright, platform terms, or applicable law are not authorized.
          </p>
        </section>
      </article>
    </main>
  );
}

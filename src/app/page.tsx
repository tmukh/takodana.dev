import Orrery from "@/components/Orrery";
import { SiteNav } from "@/components/SiteHeader";
import styles from "./home.module.css";

export default function Home() {
  return (
    <div className={styles.space}>
      <Orrery />
      <header className={styles.header}>
        <SiteNav dark />
      </header>
      <section aria-labelledby="who" className={styles.intro}>
        <p className={styles.kicker}>A waystation · Berlin</p>
        <h1 id="who" className={styles.name}>
          Tarik Abu Mukh
        </h1>
        <p className={styles.line}>
          I build systems end to end, then measure whether they work. Everything here orbits one machine in my flat.
        </p>
        <p className={styles.hint}>drag to look around · hold to bend the orbits · click a world</p>
      </section>
    </div>
  );
}

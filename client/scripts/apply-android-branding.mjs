import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";

function toDirectoryUrl(pathOrUrl) {
  if (!pathOrUrl) {
    return new URL("../android/app/src/main/res/", import.meta.url);
  }

  const normalized = pathOrUrl.endsWith("/") || pathOrUrl.endsWith("\\") ? pathOrUrl : `${pathOrUrl}/`;
  return pathToFileURL(normalized);
}

async function writeResource(resRoot, relativePath, content) {
  const targetUrl = new URL(relativePath, resRoot);
  const targetPath = fileURLToPath(targetUrl);
  await mkdir(fileURLToPath(new URL("./", targetUrl)), { recursive: true });
  await writeFile(targetPath, `${content.trim()}\n`, "utf8");
}

const resRoot = toDirectoryUrl(process.env.ANDROID_RES_DIR);

const colorsXml = `
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="temptalk_icon_background">#020403</color>
</resources>
`;

const foregroundXml = `
<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">
    <path
        android:fillColor="#07140F"
        android:pathData="M32,24 L76,24 Q84,24 84,32 L84,76 Q84,84 76,84 L32,84 Q24,84 24,76 L24,32 Q24,24 32,24 Z" />
    <path
        android:fillColor="@android:color/transparent"
        android:pathData="M32,24 L76,24 Q84,24 84,32 L84,76 Q84,84 76,84 L32,84 Q24,84 24,76 L24,32 Q24,24 32,24 Z"
        android:strokeColor="#36FF88"
        android:strokeWidth="2.5" />
    <group
        android:translateX="30"
        android:translateY="30"
        android:scaleX="2"
        android:scaleY="2">
        <path
            android:fillColor="@android:color/transparent"
            android:pathData="M2,12 C2,6.5 6.5,2 12,2 C15.3,2 18.2,3.6 20,6"
            android:strokeColor="#36FF88"
            android:strokeWidth="1.8"
            android:strokeLineCap="round"
            android:strokeLineJoin="round" />
        <path
            android:fillColor="@android:color/transparent"
            android:pathData="M5,19.5 C5.5,18 6,15 6,12 C6,8.7 8.7,6 12,6 C15.3,6 18,8.7 18,12 C18,14.8 18.5,17.5 19,19.5"
            android:strokeColor="#36FF88"
            android:strokeWidth="1.8"
            android:strokeLineCap="round"
            android:strokeLineJoin="round" />
        <path
            android:fillColor="@android:color/transparent"
            android:pathData="M8,21 C8.5,19.5 9,15.8 9,12 C9,10.3 10.3,9 12,9 C13.7,9 15,10.3 15,12 C15,15.8 15.5,19.5 16,21"
            android:strokeColor="#36FF88"
            android:strokeWidth="1.8"
            android:strokeLineCap="round"
            android:strokeLineJoin="round" />
        <path
            android:fillColor="@android:color/transparent"
            android:pathData="M12,12 L12,21"
            android:strokeColor="#36FF88"
            android:strokeWidth="1.8"
            android:strokeLineCap="round"
            android:strokeLineJoin="round" />
    </group>
    <path
        android:fillColor="@android:color/transparent"
        android:pathData="M79,74 C86,70 91,64 94,56"
        android:strokeColor="#9A5CFF"
        android:strokeAlpha="0.58"
        android:strokeWidth="2.5"
        android:strokeLineCap="round" />
</vector>
`;

const monochromeXml = `
<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">
    <group
        android:translateX="30"
        android:translateY="30"
        android:scaleX="2"
        android:scaleY="2">
        <path
            android:fillColor="@android:color/transparent"
            android:pathData="M2,12 C2,6.5 6.5,2 12,2 C15.3,2 18.2,3.6 20,6"
            android:strokeColor="#FFFFFFFF"
            android:strokeWidth="1.8"
            android:strokeLineCap="round"
            android:strokeLineJoin="round" />
        <path
            android:fillColor="@android:color/transparent"
            android:pathData="M5,19.5 C5.5,18 6,15 6,12 C6,8.7 8.7,6 12,6 C15.3,6 18,8.7 18,12 C18,14.8 18.5,17.5 19,19.5"
            android:strokeColor="#FFFFFFFF"
            android:strokeWidth="1.8"
            android:strokeLineCap="round"
            android:strokeLineJoin="round" />
        <path
            android:fillColor="@android:color/transparent"
            android:pathData="M8,21 C8.5,19.5 9,15.8 9,12 C9,10.3 10.3,9 12,9 C13.7,9 15,10.3 15,12 C15,15.8 15.5,19.5 16,21"
            android:strokeColor="#FFFFFFFF"
            android:strokeWidth="1.8"
            android:strokeLineCap="round"
            android:strokeLineJoin="round" />
        <path
            android:fillColor="@android:color/transparent"
            android:pathData="M12,12 L12,21"
            android:strokeColor="#FFFFFFFF"
            android:strokeWidth="1.8"
            android:strokeLineCap="round"
            android:strokeLineJoin="round" />
    </group>
</vector>
`;

const adaptiveIconXml = `
<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/temptalk_icon_background" />
    <foreground android:drawable="@drawable/temptalk_icon_foreground" />
    <monochrome android:drawable="@drawable/temptalk_icon_monochrome" />
</adaptive-icon>
`;

await writeResource(resRoot, "values/temptalk_icon_colors.xml", colorsXml);
await writeResource(resRoot, "drawable/temptalk_icon_foreground.xml", foregroundXml);
await writeResource(resRoot, "drawable/temptalk_icon_monochrome.xml", monochromeXml);
await writeResource(resRoot, "mipmap-anydpi-v26/ic_launcher.xml", adaptiveIconXml);
await writeResource(resRoot, "mipmap-anydpi-v26/ic_launcher_round.xml", adaptiveIconXml);

console.log(`TempTalk Android icon resources written to ${fileURLToPath(resRoot)}`);

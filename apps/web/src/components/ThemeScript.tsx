import { getTheme } from "@/app/theme/actions";

/**
 * Script inline injetado no <head> antes da hidratacao.
 * Le o cookie 'theme' e aplica data-theme no <html> imediatamente,
 * evitando flash of light content (FOUC) em dark mode.
 *
 * Sem este script, o usuario com cookie=dark veria a tela branca
 * por um frame antes do React montar.
 */
export function ThemeScript() {
  const code = `
(function() {
  try {
    var theme = document.cookie.match(/(?:^|; )theme=([^;]+)/);
    theme = theme ? decodeURIComponent(theme[1]) : 'system';
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else if (theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    }
    // 'system': nao seta data-theme, deixa @media prefers-color-scheme atuar
  } catch (e) {}
})();
`;

  return (
    <script
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: code }}
    />
  );
}

/**
 * Versao SSR: le o cookie no servidor e retorna o valor para o layout.
 */
export async function getInitialTheme(): Promise<"light" | "dark" | "system"> {
  return await getTheme();
}
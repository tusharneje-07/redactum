export interface Theme {
  name: string;
  description: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    success: string;
    error: string;
    warning: string;
    muted: string;
    text: string;
    textDim: string;
    background: string;
    backgroundAlt: string;
    border: string;
    borderFocus: string;
    cursor: string;
    inputBackground: string;
    highlight: string;
  };
}

export const themes: Theme[] = [
  {
    name: 'opencode',
    description: 'OpenCode-inspired dark theme',
    colors: {
      primary: '#61AFEF',
      secondary: '#C678DD',
      accent: '#98C379',
      success: '#98C379',
      error: '#E06C75',
      warning: '#E5C07B',
      muted: '#5C6370',
      text: '#ABB2BF',
      textDim: '#828997',
      background: '#282C34',
      backgroundAlt: '#2C313A',
      border: '#3E4451',
      borderFocus: '#61AFEF',
      cursor: '#61AFEF',
      inputBackground: '#2C313A',
      highlight: '#3E4451',
    },
  },
  {
    name: 'dracula',
    description: 'Dracula color scheme',
    colors: {
      primary: '#BD93F9',
      secondary: '#FF79C6',
      accent: '#50FA7B',
      success: '#50FA7B',
      error: '#FF5555',
      warning: '#F1FA8C',
      muted: '#6272A4',
      text: '#F8F8F2',
      textDim: '#6272A4',
      background: '#282A36',
      backgroundAlt: '#44475A',
      border: '#6272A4',
      borderFocus: '#BD93F9',
      cursor: '#BD93F9',
      inputBackground: '#44475A',
      highlight: '#44475A',
    },
  },
  {
    name: 'nord',
    description: 'Arctic, north-bluish theme',
    colors: {
      primary: '#88C0D0',
      secondary: '#B48EAD',
      accent: '#A3BE8C',
      success: '#A3BE8C',
      error: '#BF616A',
      warning: '#EBCB8B',
      muted: '#4C566A',
      text: '#D8DEE9',
      textDim: '#4C566A',
      background: '#2E3440',
      backgroundAlt: '#3B4252',
      border: '#4C566A',
      borderFocus: '#88C0D0',
      cursor: '#88C0D0',
      inputBackground: '#3B4252',
      highlight: '#434C5E',
    },
  },
  {
    name: 'tokyo-night',
    description: 'Tokyo Night color palette',
    colors: {
      primary: '#7AA2F7',
      secondary: '#BB9AF7',
      accent: '#9ECE6A',
      success: '#9ECE6A',
      error: '#F7768E',
      warning: '#E0AF68',
      muted: '#565F89',
      text: '#A9B1D6',
      textDim: '#565F89',
      background: '#1A1B26',
      backgroundAlt: '#24283B',
      border: '#414868',
      borderFocus: '#7AA2F7',
      cursor: '#7AA2F7',
      inputBackground: '#24283B',
      highlight: '#414868',
    },
  },
  {
    name: 'gruvbox',
    description: 'Retro groove color scheme',
    colors: {
      primary: '#83A598',
      secondary: '#D3869B',
      accent: '#B8BB26',
      success: '#B8BB26',
      error: '#FB4934',
      warning: '#FABD2F',
      muted: '#665C54',
      text: '#EBDBB2',
      textDim: '#928374',
      background: '#282828',
      backgroundAlt: '#3C3836',
      border: '#504945',
      borderFocus: '#83A598',
      cursor: '#83A598',
      inputBackground: '#3C3836',
      highlight: '#504945',
    },
  },
  {
    name: 'catppuccin',
    description: 'Soothing pastel theme',
    colors: {
      primary: '#89B4FA',
      secondary: '#F5C2E7',
      accent: '#A6E3A1',
      success: '#A6E3A1',
      error: '#F38BA8',
      warning: '#F9E2AF',
      muted: '#6C7086',
      text: '#CDD6F4',
      textDim: '#6C7086',
      background: '#1E1E2E',
      backgroundAlt: '#313244',
      border: '#45475A',
      borderFocus: '#89B4FA',
      cursor: '#89B4FA',
      inputBackground: '#313244',
      highlight: '#45475A',
    },
  },
  {
    name: 'monokai',
    description: 'Classic Monokai theme',
    colors: {
      primary: '#66D9EF',
      secondary: '#F92672',
      accent: '#A6E22E',
      success: '#A6E22E',
      error: '#F92672',
      warning: '#E6DB74',
      muted: '#75715E',
      text: '#F8F8F2',
      textDim: '#75715E',
      background: '#272822',
      backgroundAlt: '#383830',
      border: '#49483E',
      borderFocus: '#66D9EF',
      cursor: '#66D9EF',
      inputBackground: '#383830',
      highlight: '#49483E',
    },
  },
  {
    name: 'github-dark',
    description: 'GitHub dark mode colors',
    colors: {
      primary: '#58A6FF',
      secondary: '#F778BA',
      accent: '#3FB950',
      success: '#3FB950',
      error: '#F85149',
      warning: '#D29922',
      muted: '#484F58',
      text: '#C9D1D9',
      textDim: '#8B949E',
      background: '#0D1117',
      backgroundAlt: '#161B22',
      border: '#30363D',
      borderFocus: '#58A6FF',
      cursor: '#58A6FF',
      inputBackground: '#161B22',
      highlight: '#21262D',
    },
  },
  {
    name: 'solarized-dark',
    description: 'Precision colors for machines and people',
    colors: {
      primary: '#268BD2',
      secondary: '#D33682',
      accent: '#859900',
      success: '#859900',
      error: '#DC322F',
      warning: '#B58900',
      muted: '#586E75',
      text: '#93A1A1',
      textDim: '#657B83',
      background: '#002B36',
      backgroundAlt: '#073642',
      border: '#586E75',
      borderFocus: '#268BD2',
      cursor: '#268BD2',
      inputBackground: '#073642',
      highlight: '#083D4D',
    },
  },
  {
    name: 'one-dark',
    description: 'Atom One Dark theme',
    colors: {
      primary: '#61AFEF',
      secondary: '#C678DD',
      accent: '#98C379',
      success: '#98C379',
      error: '#E06C75',
      warning: '#E5C07B',
      muted: '#5C6370',
      text: '#ABB2BF',
      textDim: '#828997',
      background: '#282C34',
      backgroundAlt: '#2C313C',
      border: '#3E4451',
      borderFocus: '#61AFEF',
      cursor: '#61AFEF',
      inputBackground: '#2C313C',
      highlight: '#3E4451',
    },
  },
];

export function getTheme(name: string): Theme {
  return themes.find(t => t.name === name) || themes[0];
}
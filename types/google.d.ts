interface GoogleCredentialResponse {
  credential: string;
  select_by: string;
}

interface GoogleAccountsId {
  initialize: (config: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
  }) => void;
  renderButton: (
    element: HTMLElement,
    config: {
      theme?: string;
      size?: string;
      width?: string;
      text?: string;
    }
  ) => void;
  prompt: () => void;
}

interface Window {
  google: {
    accounts: {
      id: GoogleAccountsId;
    };
  };
}

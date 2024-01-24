{ pkgs }: {
  deps = [
    pkgs.nodejs_21
    pkgs.nodePackages.typescript-language-server
  ];
}
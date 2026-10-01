{
  description = "MedChecklist Qt6 Desktop App for NixOS";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs = { self, nixpkgs }:
    let
      system = "x86_64-linux";
      pkgs = nixpkgs.legacyPackages.${system};
    in
    {
      packages.${system}.default = pkgs.stdenv.mkDerivation {
        pname = "medchecklist-desktop";
        version = "1.0.0";
        src = ./.;

        nativeBuildInputs = with pkgs; [
          cmake
          ninja
          qt6.wrapQtAppsHook
        ];

        buildInputs = with pkgs; [
          qt6.qtbase
          qt6.qtdeclarative
          qt6.qtwayland
        ];
      };

      devShells.${system}.default = pkgs.mkShell {
        buildInputs = with pkgs; [
          cmake
          ninja
          gcc
          qt6.qtbase
          qt6.qtdeclarative
          qt6.qtwayland
          qt6.wrapQtAppsHook
        ];

        shellHook = ''
          export Qt6_DIR=${pkgs.qt6.qtbase}/lib/cmake/Qt6
          echo "MedChecklist Qt6 Development Environment Loaded on NixOS"
        '';
      };
    };
}

{
  description = "MedChecklist Qt6 Desktop App";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs = { self, nixpkgs }:
    let
      system = "x86_64-linux";
      pkgs = nixpkgs.legacyPackages.${system};
    in
    {
      devShells.${system}.default = pkgs.mkShell {
        buildInputs = with pkgs; [
          cmake
          ninja
          gcc
          qt6.qtbase
          qt6.qtdeclarative
          qt6.qtwayland
        ];

        shellHook = ''
          export Qt6_DIR=${pkgs.qt6.qtbase}/lib/cmake/Qt6
          echo "MedChecklist Qt6 Development Environment Loaded"
        '';
      };
    };
}

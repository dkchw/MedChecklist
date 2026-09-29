{
  description = "MedChecklist - Minimalist Medical Checklist & Patient Encounter Platform";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            nodejs_22
            rustc
            cargo
            pkg-config
            openssl
            webkitgtk_4_1
            gtk3
            libsoup_3
            gh
            git
          ];

          shellHook = ''
            echo "🏥 MedChecklist Nix development environment loaded."
            echo "Node: $(node --version), NPM: $(npm --version), Rust: $(rustc --version)"
          '';
        };
      }
    );
}

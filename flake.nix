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

        desktopLauncher = pkgs.writeShellScriptBin "medchecklist-desktop" ''
          set -e
          DEBUG_MODE=0
          PORT=3000

          for arg in "$@"; do
            if [ "$arg" = "--debug" ]; then
              DEBUG_MODE=1
            fi
          done

          echo "🏥 [MedChecklist] Starting Desktop Workstation..."

          APP_DIR="$(pwd)"
          if [ ! -d "$APP_DIR/dist" ]; then
            echo "📦 Building production distribution files..."
            ${pkgs.nodejs_22}/bin/npm --prefix "$APP_DIR" run build
          fi

          if [ "$DEBUG_MODE" -eq 1 ]; then
            echo "🔍 [DEBUG MODE ENABLED] Starting local server with verbose logging on port $PORT..."
          fi

          # Start server in background
          ${pkgs.python3}/bin/python3 -m http.server "$PORT" --directory "$APP_DIR/dist" &
          SERVER_PID=$!

          cleanup() {
            echo -e "\n🛑 Stopping MedChecklist background server..."
            kill $SERVER_PID 2>/dev/null || true
          }
          trap cleanup EXIT INT TERM

          sleep 0.8
          URL="http://localhost:$PORT"
          echo "🌐 MedChecklist active at $URL"

          if command -v chromium >/dev/null 2>&1; then
            if [ "$DEBUG_MODE" -eq 1 ]; then
              echo "Opening Chromium with DevTools enabled..."
              chromium --app="$URL" --auto-open-devtools-for-tabs
            else
              chromium --app="$URL"
            fi
          elif command -v google-chrome >/dev/null 2>&1; then
            if [ "$DEBUG_MODE" -eq 1 ]; then
              google-chrome --app="$URL" --auto-open-devtools-for-tabs
            else
              google-chrome --app="$URL"
            fi
          elif command -v xdg-open >/dev/null 2>&1; then
            xdg-open "$URL"
            wait $SERVER_PID
          else
            echo "Please open $URL in your web browser."
            wait $SERVER_PID
          fi
        '';
      in {
        packages.default = desktopLauncher;

        apps.default = {
          type = "app";
          program = "${self.packages.${system}.default}/bin/medchecklist-desktop";
        };

        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            nodejs_22
            python3
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
            echo "Run 'nix run . -- --debug' to test desktop workstation mode."
          '';
        };
      }
    );
}

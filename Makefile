UUID     := gnollama@kerozoli.github.com
INSTALL  := $(HOME)/.local/share/gnome-shell/extensions/$(UUID)

SCHEMA_DIR := schemas
SCHEMA_XML := $(SCHEMA_DIR)/org.gnome.shell.extensions.gnollama.gschema.xml
SCHEMA_BIN := $(SCHEMA_DIR)/gschemas.compiled

EXTRA_SOURCES := --extra-source=icons --extra-source=schemas

.PHONY: all compile-schemas install uninstall pack clean

all: compile-schemas

## Compile the GSettings binary schema
compile-schemas: $(SCHEMA_BIN)

$(SCHEMA_BIN): $(SCHEMA_XML)
	glib-compile-schemas $(SCHEMA_DIR)/

## Install the extension into the current user's GNOME Shell extensions folder
install: compile-schemas
	mkdir -p "$(INSTALL)"
	cp -r \
	    metadata.json \
	    extension.js \
	    prefs.js \
	    stylesheet.css \
	    icons \
	    schemas \
	    "$(INSTALL)/"
	@echo ""
	@echo "✔  Extension installed to $(INSTALL)"
	@echo "   Restart GNOME Shell (Alt+F2 → 'r' on X11, or log out on Wayland)"
	@echo "   then enable the extension with:"
	@echo "   gnome-extensions enable $(UUID)"

## Remove the installed extension
uninstall:
	rm -rf "$(INSTALL)"
	@echo "✔  Extension removed from $(INSTALL)"

## Create a distributable zip (requires gnome-extensions CLI)
pack: compile-schemas
	gnome-extensions pack --force $(EXTRA_SOURCES) .

## Remove the compiled schema binary
clean:
	rm -f $(SCHEMA_BIN)

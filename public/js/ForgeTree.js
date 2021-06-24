$(document).ready(function () {
  // first, check if current visitor is signed in
  jQuery.ajax({
    url: "/api/forge/auth/token",
    success: function (res) {
      // yes, it is signed in...
      const urn =
        "dXJuOmFkc2sub2JqZWN0czpvcy5vYmplY3Q6N3F4cHdndzl1eXl5eGQwZGJzeHdycmt2bWtwdGpiYmctZm9yZ2V0ZXN0YnVja2V0L0NvbW11bml0eV9TY2hvb2wub2Jq";
      // finally:
      launchViewer(urn);
    },
  });
});

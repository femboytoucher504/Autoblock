(function (u, plugin, metro, common, toasts, components) {
  "use strict";
  const { storage } = plugin;
  const { findByProps } = metro;
  const { FluxDispatcher, React } = common;
  const { showToast } = toasts;

  // Modüllerin yüklenip yüklenmediğini teyit etmek için
  showToast("AutoBlockNonFriends yüklendi!");

  const RelationshipStore = findByProps("getRelationshipType", "isBlocked");
  const RelationshipActions = findByProps("addRelationship", "removeRelationship") ?? {};
  const UserStore = findByProps("getCurrentUser");
  const RelationshipTypes = { FRIEND: 1, BLOCKED: 2, IGNORED: 5 };

  storage.action ??= "block";
  storage.onDM ??= true;
  storage.onMention ??= true;

  function isFriend(userId) {
    return RelationshipStore?.getRelationshipType?.(userId) === RelationshipTypes.FRIEND;
  }
  function alreadyHandled(userId) {
    if (!RelationshipStore) return false;
    const type = RelationshipStore.getRelationshipType?.(userId);
    const isBlocked = RelationshipStore.isBlocked?.(userId);
    return Boolean(isBlocked || type === RelationshipTypes.BLOCKED || type === RelationshipTypes.IGNORED);
  }
  function blockUser(userId) {
    RelationshipActions?.addRelationship?.(userId, { type: RelationshipTypes.BLOCKED });
  }
  function ignoreUser(userId) {
    RelationshipActions?.addRelationship?.(userId, { type: RelationshipTypes.IGNORED });
  }
  function handleMessage(message) {
    const me = UserStore?.getCurrentUser?.();
    if (!me || !message?.author || message.author.id === me.id) return;
    const authorId = message.author.id;
    if (isFriend(authorId) || alreadyHandled(authorId)) return;
    const isDM = !message.guild_id;
    const isMention = Array.isArray(message.mentions) && message.mentions.some((m) => m.id === me.id);
    const shouldAct = (isDM && storage.onDM) || (isMention && storage.onMention);
    if (!shouldAct) return;
    if (storage.action === "block") {
      blockUser(authorId);
      showToast(`Engellendi: ${message.author.username ?? "user"}`);
    } else {
      ignoreUser(authorId);
      showToast(`Yoksayıldı: ${message.author.username ?? "user"}`);
    }
  }
  function onMessageCreate(event) {
    try { handleMessage(event?.message); }
    catch (e) { console.error("[AutoBlockNonFriends]", e); }
  }
  function onLoad() {
    FluxDispatcher.subscribe("MESSAGE_CREATE", onMessageCreate);
  }
  function onUnload() {
    FluxDispatcher.unsubscribe("MESSAGE_CREATE", onMessageCreate);
  }
  function Settings() {
    try {
      // Revenge/Vendetta'da Form bileşenleri direkt components altındadır
      const { FormSection, FormRadioRow, FormSwitchRow, FormDivider } = components ?? {};
      const [, forceUpdate] = React.useReducer((x) => x + 1, 0);
      const update = (mutator) => { mutator(); forceUpdate(); };
      
      return React.createElement(
        FormSection,
        { title: "Action for non-friends" },
        React.createElement(FormRadioRow, {
          label: "Block",
          subLabel: "Full Discord block — they can't message or add you.",
          selected: storage.action === "block",
          onPress: () => update(() => (storage.action = "block")),
        }),
        React.createElement(FormRadioRow, {
          label: "Ignore",
          subLabel: "Discord's native Ignore — hides their messages/notifications.",
          selected: storage.action === "ignore",
          onPress: () => update(() => (storage.action = "ignore")),
        }),
        React.createElement(FormDivider, {}),
        React.createElement(FormSwitchRow, {
          label: "Trigger on direct messages",
          value: storage.onDM,
          onValueChange: (v) => update(() => (storage.onDM = v)),
        }),
        React.createElement(FormSwitchRow, {
          label: "Trigger on @mentions in servers",
          value: storage.onMention,
          onValueChange: (v) => update(() => (storage.onMention = v)),
        })
      );
    } catch (e) {
      toasts.showToast("Settings UI error: " + e.message);
      return null;
    }
  }

  u.default = { onLoad, onUnload, settings: Settings };
  Object.defineProperty(u, "__esModule", { value: true });
  return u;
})({}, vendetta.plugin, vendetta.metro, vendetta.metro.common, vendetta.ui.toasts, vendetta.ui.components);

(function (u, plugin, metro, common, toasts) {
  "use strict";
  const { storage } = plugin;
  const { findByProps } = metro;
  const { FluxDispatcher, React } = common;
  const { showToast } = toasts;

  showToast("AutoBlockNonFriends aktif!");

  const RelationshipStore = findByProps("getRelationshipType", "isBlocked");
  
  // En garanti fonksiyonları çekiyoruz
  const RelationshipActions = findByProps("blockUser", "unblockUser") ?? findByProps("addRelationship") ?? {};
  const IgnoreActions = findByProps("ignoreUser", "unignoreUser") ?? RelationshipActions;
  
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
    const isIgnored = RelationshipStore.isIgnored?.(userId);
    return Boolean(isBlocked || isIgnored || type === RelationshipTypes.BLOCKED || type === RelationshipTypes.IGNORED);
  }

  function doBlock(userId, username) {
    try {
      if (RelationshipActions.blockUser) {
        // Öncelikli yöntem: Doğrudan block fonksiyonu
        RelationshipActions.blockUser(userId, { location: "Context Menu" });
      } else if (RelationshipActions.addRelationship) {
        // Yedek yöntem
        RelationshipActions.addRelationship(userId, { type: RelationshipTypes.BLOCKED }, { location: "Context Menu" });
      } else {
        return console.error("[AutoBlock] Engelleme fonksiyonu bulunamadı.");
      }
      showToast(`Engellendi: ${username ?? "Kullanıcı"}`);
    } catch (err) {
      console.error("[AutoBlock] Engelleme hatası:", err);
    }
  }

  function doIgnore(userId, username) {
    try {
      if (IgnoreActions.ignoreUser) {
        // Öncelikli yöntem: Doğrudan ignore fonksiyonu
        IgnoreActions.ignoreUser(userId, { location: "Context Menu" });
      } else if (RelationshipActions.addRelationship) {
        // Yedek yöntem
        RelationshipActions.addRelationship(userId, { type: RelationshipTypes.IGNORED }, { location: "Context Menu" });
      } else {
        return console.error("[AutoBlock] Yoksayma fonksiyonu bulunamadı.");
      }
      showToast(`Yoksayıldı: ${username ?? "Kullanıcı"}`);
    } catch (err) {
      console.error("[AutoBlock] Yoksayma hatası:", err);
    }
  }

  function handleMessage(message) {
    const me = UserStore?.getCurrentUser?.();
    const UserStore = findByProps("getCurrentUser"); // Güvenlik amacıyla burada da kontrol ediyoruz
    const currentUser = UserStore?.getCurrentUser?.();
    
    if (!currentUser || !message?.author || message.author.id === currentUser.id) return;
    
    const authorId = message.author.id;
    if (isFriend(authorId) || alreadyHandled(authorId)) return;
    
    const isDM = !message.guild_id;
    const isMention = Array.isArray(message.mentions) && message.mentions.some((m) => m.id === currentUser.id);
    
    const shouldAct = (isDM && storage.onDM) || (isMention && storage.onMention);
    if (!shouldAct) return;

    const targetUsername = message.author.username;

    if (storage.action === "block") {
      doBlock(authorId, targetUsername);
    } else {
      doIgnore(authorId, targetUsername);
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
      const FormSection = findByProps("FormSection")?.FormSection ?? findByProps("FormSection");
      const FormRadioRow = findByProps("FormRadioRow")?.FormRadioRow ?? findByProps("FormRadioRow");
      const FormSwitchRow = findByProps("FormSwitchRow")?.FormSwitchRow ?? findByProps("FormSwitchRow");
      const FormDivider = findByProps("FormDivider")?.FormDivider ?? findByProps("FormDivider");

      const [, forceUpdate] = React.useReducer((x) => x + 1, 0);
      const update = (mutator) => { mutator(); forceUpdate(); };

      if (!FormSection || !FormRadioRow || !FormSwitchRow) {
        return React.createElement(common.components.Text ?? "Text", {}, "Ayarlar yüklenemedi: UYUMSUZ_REVENGE_VERSION");
      }
      
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
        FormDivider ? React.createElement(FormDivider, {}) : null,
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
      return React.createElement(common.components.Text ?? "Text", {}, "Hata: " + e.message);
    }
  }

  u.default = { onLoad, onUnload, settings: Settings };
  Object.defineProperty(u, "__esModule", { value: true });
  return u;
})({}, vendetta.plugin, vendetta.metro, vendetta.metro.common, vendetta.ui.toasts);
 

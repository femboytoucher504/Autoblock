import { storage } from "@vendetta/plugin";
import { findByProps } from "@vendetta/metro";
import { FluxDispatcher, React } from "@vendetta/metro/common";
import { Forms } from "@vendetta/ui/components";
import { showToast } from "@vendetta/ui/toasts";

const { FormSection, FormRadioRow, FormSwitchRow, FormDivider } = Forms;

// Revenge / Güncel Discord uyumlu modül eşleşmeleri
const RelationshipStore = findByProps("getRelationshipType", "isBlocked");
const RelationshipActions = findByProps("addRelationship", "removeRelationship") ?? {};
const UserStore = findByProps("getCurrentUser");

// Güncel Discord Relationship tipleri
const RelationshipTypes = { 
  FRIEND: 1, 
  BLOCKED: 2,
  IGNORED: 5 
};

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
  
  // Eğer zaten engelliyse veya ilişkisi BLOCKED/IGNORED ise true dön
  return Boolean(isBlocked || type === RelationshipTypes.BLOCKED || type === RelationshipTypes.IGNORED);
}

function blockUser(userId) {
  RelationshipActions?.addRelationship?.(userId, { type: RelationshipTypes.BLOCKED });
}

function ignoreUser(userId) {
  // Güncel Discord'da ignore işlemi artık bir ilişki tipidir
  RelationshipActions?.addRelationship?.(userId, { type: RelationshipTypes.IGNORED });
}

function handleMessage(message) {
  const me = UserStore?.getCurrentUser?.();
  if (!me || !message?.author || message.author.id === me.id) return;

  const authorId = message.author.id;
  if (isFriend(authorId) || alreadyHandled(authorId)) return;

  const isDM = !message.guild_id;
  const isMention =
    Array.isArray(message.mentions) && message.mentions.some((m) => m.id === me.id);

  const shouldAct = (isDM && storage.onDM) || (isMention && storage.onMention);
  if (!shouldAct) return;

  if (storage.action === "block") {
    blockUser(authorId);
    showToast(`Blocked ${message.author.username ?? "user"} (not a friend)`);
  } else {
    ignoreUser(authorId);
    showToast(`Ignored ${message.author.username ?? "user"} (not a friend)`);
  }
}

function onMessageCreate(event) {
  try {
    handleMessage(event?.message);
  } catch (e) {
    console.error("[AutoBlockNonFriends]", e);
  }
}

function onLoad() {
  FluxDispatcher.subscribe("MESSAGE_CREATE", onMessageCreate);
}

function onUnload() {
  FluxDispatcher.unsubscribe("MESSAGE_CREATE", onMessageCreate);
}

function Settings() {
  const [, forceUpdate] = React.useReducer((x) => x + 1, 0);
  const update = (mutator) => {
    mutator();
    forceUpdate();
  };

  return (
    <FormSection title="Action for non-friends">
      <FormRadioRow
        label="Block"
        subLabel="Full Discord block — they can't message or add you."
        selected={storage.action === "block"}
        onPress={() => update(() => (storage.action = "block"))}
      />
      <FormRadioRow
        label="Ignore"
        subLabel="Discord's native Ignore — hides their messages/notifications."
        selected={storage.action === "ignore"}
        onPress={() => update(() => (storage.action = "ignore"))}
      />
      <FormDivider />
      <FormSwitchRow
        label="Trigger on direct messages"
        value={storage.onDM}
        onValueChange={(v) => update(() => (storage.onDM = v))}
      />
      <FormSwitchRow
        label="Trigger on @mentions in servers"
        value={storage.onMention}
        onValueChange={(v) => update(() => (storage.onMention = v))}
      />
    </FormSection>
  );
}

export default {
  onLoad,
  onUnload,
  settings: Settings,
};
                                     

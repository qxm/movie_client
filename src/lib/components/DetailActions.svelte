
<script lang="ts">
  let {
    onEdit,
    onDelete,
    deleting = false
  }: {
    onEdit: () => void;
    onDelete: () => void | Promise<void>;
    deleting?: boolean;
  } = $props();

  let confirming = $state(false);
</script>

<div class="actions">
  <button class="edit" onclick={onEdit}>
    Edit
  </button>

  <button
    class="delete"
    onclick={() => confirming = true}
    disabled={deleting}
  >
    Delete
  </button>
</div>

{#if confirming}
  <div class="overlay" role="presentation">
    <div
      class="dialog"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="delete-title"
      aria-describedby="delete-message"
    >
      <h2 id="delete-title">Confirm deletion</h2>
      <p id="delete-message">
        Are you sure? This action cannot be undone.
      </p>

      <div class="actions">
        <button
          onclick={() => confirming = false}
          disabled={deleting}
        >
          Cancel
        </button>

        <button
          class="delete"
          disabled={deleting}
          onclick={async () => {
            await onDelete();
            confirming = false;
          }}
        >
          {deleting ? 'Deleting...' : 'Confirm Delete'}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .actions {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
  }

  button {
    padding: 10px 18px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    cursor: pointer;
  }

  button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .edit {
    background: #2563eb;
    color: white;
    border-color: #2563eb;
  }

  .delete {
    background: #dc2626;
    color: white;
    border-color: #dc2626;
  }

  .overlay {
    position: fixed;
    inset: 0;
    background: rgb(0 0 0 / 50%);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    z-index: 100;
  }

  .dialog {
    width: min(420px, 100%);
    background: white;
    border-radius: 12px;
    padding: 24px;
  }
</style>


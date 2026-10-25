import { readSave, newSave, writeSave } from './core/save';
import { startSandbox } from './engine/sandbox';
import { toast } from './ui/toast';

const save = readSave() ?? newSave();

document.getElementById('btn-save')?.addEventListener('click', () => {
  writeSave(save);
  toast('Game saved');
});

startSandbox();

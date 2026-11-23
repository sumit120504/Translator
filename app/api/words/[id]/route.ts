import { NextRequest, NextResponse } from 'next/server';
import { updateWordStatus, deleteWord } from '@/lib/sheets';
import { WordStatus } from '@/lib/types';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await req.json().catch(() => ({}));
    const { status } = body;

    const validStatuses: WordStatus[] = ['new', 'learning', 'learned'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be "new", "learning", or "learned".' },
        { status: 400 }
      );
    }

    const updated = await updateWordStatus(id, status);
    if (!updated) {
      return NextResponse.json({ error: 'Word not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, word: updated });
  } catch (error: any) {
    console.error('Error updating word status:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to update word status.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const success = await deleteWord(id);

    if (!success) {
      return NextResponse.json({ error: 'Word not found or could not be deleted.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: `Word ${id} deleted.` });
  } catch (error: any) {
    console.error('Error deleting word:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to delete word.' },
      { status: 500 }
    );
  }
}

// The module 'vscode' contains the VS Code extensibility API
// Import the necessary extensibility types to use in your code below
import {
  window,
  commands,
  Disposable,
  ExtensionContext,
  StatusBarAlignment,
  StatusBarItem,
  TextDocument
} from "vscode";
import * as request from "request";

// This method is called when your extension is activated. Activation is
// controlled by the activation events defined in package.json.
export function activate(context: ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error).
  // This line of code will only be executed once when your extension is activated.
  console.log('Congratulations, your extension "WordCount" is now active!');

  // create a new word counter
  let problemCounter = new ProblemCounter();
  let controller = new ProblemCounterController(problemCounter);

  // Add to a list of disposables which are disposed when this extension is deactivated.
  context.subscriptions.push(controller);
  context.subscriptions.push(problemCounter);
}

class ProblemCounter {
  private _statusBarItem: StatusBarItem = window.createStatusBarItem(
    StatusBarAlignment.Left
  );

  public updateWordCount() {
    // Get the current text editor
    let editor = window.activeTextEditor;
    if (!editor) {
      this._statusBarItem.hide();
      return;
    }

    let doc = editor.document;

    // Only update status if a Markdown file
    if (doc.languageId === "yaml") {
      this._getProblemCount(doc).then(problemCount => {
        this._statusBarItem.text =
          problemCount !== 1 ? `${problemCount} Problems` : "1 Problem";
        
        
        if (problemCount > 0) {
            this._getProblemTitles().then(titles => {
                this._statusBarItem.tooltip = titles;
            });
        } else {
            this._statusBarItem.tooltip = undefined;
        }
        
        this._statusBarItem.show();
      });
    } else {
      this._statusBarItem.hide();
    }
  }

  public _getProblemTitles(): Promise<string> {
    return new Promise(resolve => {
        request(
          "http://localhost:8080/.rest/registry/v1/problems?mgnlUserId=superuser&mgnlUserPSWD=superuser",
          (error, response, body) => {
            resolve(JSON.parse(body).map((l: String) => '· ' + l).join('\n'));
          }
        );
      });
  }

  public _getProblemCount(doc: TextDocument): Promise<number> {
    return new Promise(resolve => {
      request(
        "http://localhost:8080/.rest/registry/v1/problems?mgnlUserId=superuser&mgnlUserPSWD=superuser",
        (error, response, body) => {
          resolve(JSON.parse(body).length);
        }
      );
    });
  }

  dispose() {
    this._statusBarItem.dispose();
  }
}

class ProblemCounterController {
  private _problemCounter: ProblemCounter;
  private _disposable: Disposable;

  constructor(problemCounter: ProblemCounter) {
    this._problemCounter = problemCounter;

    // subscribe to selection change and editor activation events
    let subscriptions: Disposable[] = [];
    window.onDidChangeTextEditorSelection(this._onEvent, this, subscriptions);
    window.onDidChangeActiveTextEditor(this._onEvent, this, subscriptions);
    setInterval(() => {
        this._problemCounter.updateWordCount();
    }, 1000);

    // update the counter for the current file
    this._problemCounter.updateWordCount();

    // create a combined disposable from both event subscriptions
    this._disposable = Disposable.from(...subscriptions);
  }

  dispose() {
    this._disposable.dispose();
  }

  private _onEvent() {
    this._problemCounter.updateWordCount();
  }
}

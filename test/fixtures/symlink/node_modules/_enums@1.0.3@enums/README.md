# Enums

## Usage

```js
var status = new Enums([
  {
    name: 'CLOSED',
    code: '1',
    message: 'Shop close'
  },
  {
    name: 'OPENED',
    code: '2',
    message: 'Shop open'
  }
]);

console.log(status.CLOSED);
console.log(status.OPENED);
```
